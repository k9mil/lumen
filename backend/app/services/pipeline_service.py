"""Pipeline service - connects agents to database."""

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.building import Building, BuildingStatus, RiskTier
from app.models.snapshot import Snapshot
from app.models.evidence_item import EvidenceItem, SignalType
from lumen_agents import AgentConfig, PipelineOrchestrator

logger = logging.getLogger(__name__)


class PipelineService:
    """Service for running pipelines and persisting results."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.orchestrator = PipelineOrchestrator(config)

    async def run_pipeline_for_building(
        self, db: AsyncSession, building_id: int, force: bool = False
    ) -> Snapshot:
        """Run pipeline for a building and save snapshot.

        Args:
            db: Database session
            building_id: ID of building to process
            force: Run even if recently processed

        Returns:
            New snapshot with all pipeline data
        """
        # Fetch building
        result = await db.execute(select(Building).where(Building.id == building_id))
        building = result.scalar_one_or_none()

        if not building:
            raise ValueError(f"Building {building_id} not found")

        logger.info(f"Running pipeline for building {building_id}: {building.address}")

        # Get previous snapshot for change detection
        previous_snapshot = await self._get_latest_snapshot(db, building_id)
        previous_data = self._snapshot_to_dict(previous_snapshot) if previous_snapshot else None

        # Run pipeline
        pipeline_result = await self.orchestrator.run_pipeline(
            building_id=building_id,
            address=building.address,
            property_class=building.property_class or "Unknown",
            previous_snapshot=previous_data,
        )

        # Create snapshot
        snapshot = Snapshot(
            building_id=building_id,
            geocode_data=pipeline_result.geocode_data,
            companies_house_data=pipeline_result.companies_house_data,
            places_data=None,  # Not implemented yet
            street_view_analysis=pipeline_result.vision_data,
            licensing_data=pipeline_result.licensing_data,
            risk_score=pipeline_result.score,
            risk_tier=pipeline_result.tier,
        )

        db.add(snapshot)
        await db.flush()  # Get snapshot ID

        # Create evidence items
        for item_data in pipeline_result.evidence_items:
            evidence = EvidenceItem(
                snapshot_id=snapshot.id,
                signal_type=self._map_signal_type(item_data.get("signal_type", "unknown")),
                description=item_data.get("description", ""),
                weight=item_data.get("weight", 0.0),
                raw_data=item_data.get("details"),
            )
            db.add(evidence)

        # Update building with latest status
        await self._update_building_status(db, building, pipeline_result, previous_snapshot)

        await db.commit()

        logger.info(
            f"Pipeline complete for building {building_id}: "
            f"score={pipeline_result.score}, tier={pipeline_result.tier}"
        )

        return snapshot

    async def run_pipeline_for_buildings(
        self, db: AsyncSession, building_ids: list[int], concurrency: int = 3
    ) -> list[Snapshot]:
        """Run pipeline for multiple buildings concurrently.

        Args:
            db: Database session
            building_ids: List of building IDs
            concurrency: Max concurrent pipelines

        Returns:
            List of snapshots created
        """
        import asyncio

        semaphore = asyncio.Semaphore(concurrency)
        snapshots = []

        async def run_with_semaphore(building_id: int):
            async with semaphore:
                try:
                    # Create new session for each concurrent run
                    return await self.run_pipeline_for_building(db, building_id)
                except Exception as e:
                    logger.error(f"Pipeline failed for building {building_id}: {e}")
                    return None

        tasks = [run_with_semaphore(bid) for bid in building_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Snapshot):
                snapshots.append(result)

        return snapshots

    async def _get_latest_snapshot(self, db: AsyncSession, building_id: int) -> Snapshot | None:
        """Get most recent snapshot for building."""
        result = await db.execute(
            select(Snapshot)
            .where(Snapshot.building_id == building_id)
            .order_by(Snapshot.run_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    def _snapshot_to_dict(self, snapshot: Snapshot) -> dict[str, Any]:
        """Convert snapshot to dict for change detection."""
        return {
            "vision_data": snapshot.street_view_analysis,
            "companies_house_data": snapshot.companies_house_data,
            "places_data": snapshot.places_data,
            "licensing_data": snapshot.licensing_data,
            "score": snapshot.risk_score,
            "tier": snapshot.risk_tier,
        }

    async def _update_building_status(
        self,
        db: AsyncSession,
        building: Building,
        pipeline_result: Any,
        previous_snapshot: Snapshot | None,
    ) -> None:
        """Update building status based on pipeline results."""
        # Update score and tier
        building.risk_score = pipeline_result.score
        building.risk_tier = pipeline_result.tier
        building.updated_at = datetime.utcnow()

        # Determine status
        if pipeline_result.material_change and pipeline_result.score >= 40:
            building.status = BuildingStatus.NEEDS_REVIEW
            logger.info(f"Building {building.id} flagged for review (material change)")
        elif pipeline_result.tier in ["high", "critical"]:
            building.status = BuildingStatus.NEEDS_REVIEW
            logger.info(f"Building {building.id} flagged for review (high risk)")
        elif (
            previous_snapshot
            and previous_snapshot.risk_tier == "low"
            and pipeline_result.tier == "medium"
        ):
            building.status = BuildingStatus.NEEDS_REVIEW
            logger.info(f"Building {building.id} flagged for review (risk escalation)")

    def _map_signal_type(self, signal_type: str) -> str:
        """Map pipeline signal type to database enum."""
        mapping = {
            "cv_classification_change": SignalType.CV_CLASSIFICATION,
            "cv_classification_mismatch": SignalType.CV_CLASSIFICATION,
            "sic_mismatch": SignalType.SIC_MISMATCH,
            "licensing_nearby": SignalType.LICENSING,
            "keyword_hit": SignalType.KEYWORD_HIT,
        }
        return mapping.get(signal_type, signal_type)

    async def get_building_evidence(
        self, db: AsyncSession, building_id: int, snapshot_id: int | None = None
    ) -> list[EvidenceItem]:
        """Get evidence items for a building.

        Args:
            db: Database session
            building_id: Building ID
            snapshot_id: Specific snapshot, or latest if None

        Returns:
            List of evidence items
        """
        if snapshot_id:
            result = await db.execute(
                select(EvidenceItem)
                .join(Snapshot)
                .where(Snapshot.id == snapshot_id)
                .where(Snapshot.building_id == building_id)
            )
        else:
            # Get latest snapshot's evidence
            subquery = (
                select(Snapshot.id)
                .where(Snapshot.building_id == building_id)
                .order_by(Snapshot.run_at.desc())
                .limit(1)
            )
            result = await db.execute(
                select(EvidenceItem).where(EvidenceItem.snapshot_id.in_(subquery))
            )

        return list(result.scalars().all())

    async def get_building_snapshots(
        self, db: AsyncSession, building_id: int, limit: int = 10
    ) -> list[Snapshot]:
        """Get snapshot history for a building."""
        result = await db.execute(
            select(Snapshot)
            .where(Snapshot.building_id == building_id)
            .order_by(Snapshot.run_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
