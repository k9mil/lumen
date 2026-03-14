"""Pipeline Orchestrator - coordinates agents for building intelligence.

Flow: Geocode → Companies House → Street View → Vision → Licensing → Scoring → Change Detection
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .core.types import Result, AgentConfig
from .agents.geocode import GeocodeAgent
from .agents.companies_house import CompaniesHouseAgent
from .agents.street_view import StreetViewAgent
from .agents.vision import VisionAgent
from .agents.licensing import LicensingAgent
from .agents.scoring import ScoringAgent
from .agents.change_detection import ChangeDetectionAgent

logger = logging.getLogger(__name__)

# Global semaphore to limit concurrent pipeline runs
_pipeline_semaphore = asyncio.Semaphore(5)


@dataclass
class PipelineResult:
    """Complete result from running the pipeline."""

    success: bool
    building_id: int | None = None

    # Raw agent outputs
    geocode_data: dict | None = None
    companies_house_data: dict | None = None
    street_view_data: dict | None = None
    vision_data: dict | None = None
    licensing_data: dict | None = None

    # Derived outputs
    score: int = 0
    tier: str = "low"
    evidence_items: list = field(default_factory=list)

    # Change detection
    changed: bool = False
    material_change: bool = False
    changes: list = field(default_factory=list)

    # Metadata
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    duration_ms: float = 0.0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "success": self.success,
            "building_id": self.building_id,
            "geocode": self.geocode_data,
            "companies_house": self.companies_house_data,
            "street_view": self.street_view_data,
            "vision": self.vision_data,
            "licensing": self.licensing_data,
            "score": self.score,
            "tier": self.tier,
            "evidence_items": self.evidence_items,
            "changed": self.changed,
            "material_change": self.material_change,
            "changes": self.changes,
            "duration_ms": self.duration_ms,
            "errors": self.errors,
        }


class PipelineOrchestrator:
    """Orchestrates the full intelligence pipeline for a building."""

    def __init__(self, config: AgentConfig):
        self.config = config

        # Initialize all agents
        self.geocode_agent = GeocodeAgent(config)
        self.companies_house_agent = CompaniesHouseAgent(config)
        self.street_view_agent = StreetViewAgent(config)
        self.vision_agent = VisionAgent(config)
        self.licensing_agent = LicensingAgent(config)
        self.scoring_agent = ScoringAgent(config)
        self.change_detection_agent = ChangeDetectionAgent(config)

    async def run_pipeline(
        self,
        building_id: int,
        address: str,
        property_class: str,
        previous_snapshot: dict | None = None,
    ) -> PipelineResult:
        """Run the full pipeline for a building.

        Args:
            building_id: Database ID of the building
            address: Full address string
            property_class: Expected property class (e.g., "Retail", "Office")
            previous_snapshot: Previous pipeline results for change detection

        Returns:
            PipelineResult with all data and derived risk assessment
        """
        async with _pipeline_semaphore:
            result = PipelineResult(success=True, building_id=building_id)
            start_time = datetime.utcnow()

            logger.info(f"Starting pipeline for building {building_id}: {address}")

            try:
                # Step 1: Geocode
                await self._run_geocode(result, address)
                if not result.geocode_data:
                    result.success = False
                    result.errors.append("Geocoding failed - cannot continue without coordinates")
                    return self._finalize(result, start_time)

                lat = result.geocode_data["lat"]
                lng = result.geocode_data["lng"]

                # Step 2: Companies House (optional - continue if fails)
                await self._run_companies_house(result, address)

                # Step 3: Street View (optional - continue if fails)
                await self._run_street_view(result, lat, lng)

                # Step 4: Vision (optional - needs street view images)
                if result.street_view_data and result.street_view_data.get("images"):
                    await self._run_vision(result)
                else:
                    logger.warning("Skipping vision analysis - no street view images")
                    result.errors.append("No street view images for vision analysis")

                # Step 5: Licensing (optional)
                await self._run_licensing(result, lat, lng)

                # Step 6: Scoring (always runs, uses available data)
                await self._run_scoring(result, property_class, previous_snapshot)

                # Step 7: Change Detection (only if we have previous data)
                if previous_snapshot:
                    await self._run_change_detection(result, previous_snapshot)

            except Exception as e:
                logger.exception(f"Pipeline failed for building {building_id}")
                result.success = False
                result.errors.append(f"Pipeline error: {str(e)}")

            return self._finalize(result, start_time)

    async def _run_geocode(self, result: PipelineResult, address: str) -> None:
        """Step 1: Geocode the address."""
        logger.info("Step 1/7: Geocoding...")
        geo_result = await self.geocode_agent.execute({"address": address})

        if geo_result.success:
            result.geocode_data = geo_result.data
            logger.info(
                f"  ✓ Located: {result.geocode_data['lat']:.6f}, {result.geocode_data['lng']:.6f}"
            )
        else:
            logger.error(f"  ✗ Geocoding failed: {geo_result.error}")
            result.errors.append(f"Geocoding: {geo_result.error}")

    async def _run_companies_house(self, result: PipelineResult, address: str) -> None:
        """Step 2: Lookup Companies House data."""
        logger.info("Step 2/7: Companies House lookup...")
        ch_result = await self.companies_house_agent.execute({"address": address})

        if ch_result.success:
            result.companies_house_data = ch_result.data
            companies = ch_result.data.get("companies", [])
            logger.info(f"  ✓ Found {len(companies)} companies")
        else:
            logger.warning(f"  ⚠ Companies House failed: {ch_result.error}")
            result.errors.append(f"Companies House: {ch_result.error}")

    async def _run_street_view(self, result: PipelineResult, lat: float, lng: float) -> None:
        """Step 3: Fetch street view images."""
        logger.info("Step 3/7: Fetching street view images...")
        sv_result = await self.street_view_agent.execute({"lat": lat, "lng": lng})

        if sv_result.success:
            result.street_view_data = sv_result.data
            count = sv_result.data.get("image_count", 0)
            logger.info(f"  ✓ Fetched {count}/4 images")
        else:
            logger.warning(f"  ⚠ Street view failed: {sv_result.error}")
            result.errors.append(f"Street view: {sv_result.error}")

    async def _run_vision(self, result: PipelineResult) -> None:
        """Step 4: Analyze images with vision AI."""
        logger.info("Step 4/7: Vision analysis...")
        images = result.street_view_data.get("images", {})
        vision_result = await self.vision_agent.execute({"images": images})

        if vision_result.success:
            result.vision_data = vision_result.data
            occupier = vision_result.data.get("occupier_type", "unknown")
            confidence = vision_result.data.get("confidence", 0)
            logger.info(f"  ✓ Detected: {occupier} ({confidence:.0%} confidence)")
        else:
            logger.warning(f"  ⚠ Vision analysis failed: {vision_result.error}")
            result.errors.append(f"Vision: {vision_result.error}")

    async def _run_licensing(self, result: PipelineResult, lat: float, lng: float) -> None:
        """Step 5: Check for licensed premises."""
        logger.info("Step 5/7: Checking licensing...")
        lic_result = await self.licensing_agent.execute({"lat": lat, "lng": lng, "radius_m": 100})

        if lic_result.success:
            result.licensing_data = lic_result.data
            found = lic_result.data.get("found", False)
            count = len(lic_result.data.get("premises", []))
            logger.info(
                f"  ✓ Licensing check: {count} premises nearby"
                if found
                else "  ✓ No licensed premises nearby"
            )
        else:
            logger.warning(f"  ⚠ Licensing check failed: {lic_result.error}")
            result.errors.append(f"Licensing: {lic_result.error}")

    async def _run_scoring(
        self,
        result: PipelineResult,
        property_class: str,
        previous_snapshot: dict | None,
    ) -> None:
        """Step 6: Calculate risk score."""
        logger.info("Step 6/7: Calculating risk score...")

        # Extract previous vision data if available
        previous_vision = None
        if previous_snapshot and previous_snapshot.get("vision_data"):
            previous_vision = previous_snapshot["vision_data"]

        scoring_data = {
            "vision_data": result.vision_data,
            "companies_house_data": result.companies_house_data,
            "places_data": None,  # Not implemented yet
            "licensing_data": result.licensing_data,
            "property_class": property_class,
            "previous_vision": previous_vision,
        }

        scoring_result = await self.scoring_agent.execute(scoring_data)

        if scoring_result.success:
            result.score = scoring_result.data["score"]
            result.tier = scoring_result.data["tier"]
            result.evidence_items = scoring_result.data.get("evidence_items", [])
            logger.info(f"  ✓ Score: {result.score}/100 ({result.tier.upper()})")
        else:
            logger.error(f"  ✗ Scoring failed: {scoring_result.error}")
            result.errors.append(f"Scoring: {scoring_result.error}")

    async def _run_change_detection(
        self,
        result: PipelineResult,
        previous_snapshot: dict,
    ) -> None:
        """Step 7: Detect changes from previous snapshot."""
        logger.info("Step 7/7: Detecting changes...")

        current = {
            "vision": result.vision_data or {},
            "companies": result.companies_house_data or {"companies": []},
            "places": {"trading_name": "", "types": []},
            "licensing": result.licensing_data or {"found": False},
        }

        previous = {
            "vision": previous_snapshot.get("vision_data", {}),
            "companies": previous_snapshot.get("companies_house_data", {"companies": []}),
            "places": previous_snapshot.get("places_data", {"trading_name": "", "types": []}),
            "licensing": previous_snapshot.get("licensing_data", {"found": False}),
        }

        change_result = await self.change_detection_agent.execute(
            {
                "current": current,
                "previous": previous,
            }
        )

        if change_result.success:
            result.changed = change_result.data["changed"]
            result.material_change = change_result.data["material_change"]
            result.changes = change_result.data.get("changes", [])
            logger.info(f"  ✓ Changes: {result.changed} (material: {result.material_change})")
        else:
            logger.warning(f"  ⚠ Change detection failed: {change_result.error}")
            result.errors.append(f"Change detection: {change_result.error}")

    def _finalize(self, result: PipelineResult, start_time: datetime) -> PipelineResult:
        """Finalize result with timing and status."""
        result.completed_at = datetime.utcnow()
        result.duration_ms = (result.completed_at - start_time).total_seconds() * 1000

        # Success if at least geocoding worked and we got a score
        result.success = result.geocode_data is not None and result.duration_ms > 0

        logger.info(
            f"Pipeline completed in {result.duration_ms:.0f}ms "
            f"- Score: {result.score}/100 ({result.tier}) "
            f"- Errors: {len(result.errors)}"
        )

        return result
