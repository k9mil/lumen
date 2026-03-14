"""Pipeline API routes."""

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import settings
from app.models.building import Building
from app.schemas.pipeline import (
    PipelineRunRequest,
    PipelineRunResponse,
    PipelineStatusResponse,
    BuildingEvidenceResponse,
    BuildingSnapshotsResponse,
)
from app.services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


def get_pipeline_service() -> PipelineService:
    """Get configured pipeline service."""
    config = settings.to_agent_config()
    return PipelineService(config)


@router.post("/buildings/{building_id}/run", response_model=PipelineRunResponse)
async def run_pipeline_for_building(
    building_id: int,
    request: PipelineRunRequest | None = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    service: PipelineService = Depends(get_pipeline_service),
):
    """Run intelligence pipeline for a single building.

    Args:
        building_id: ID of building to analyze
        request: Optional run configuration
        background_tasks: FastAPI background tasks (for async processing)
        db: Database session
        service: Pipeline service

    Returns:
        Pipeline run status and snapshot ID
    """
    import asyncio

    force = request.force if request else False
    async_run = request.async_run if request else False

    if async_run:
        # Run in background
        async def run_in_background():
            async for session in get_db():  # Get new session for background task
                try:
                    await service.run_pipeline_for_building(session, building_id, force)
                except Exception as e:
                    import logging

                    logging.error(f"Background pipeline failed for {building_id}: {e}")

        background_tasks.add_task(run_in_background)

        return PipelineRunResponse(
            building_id=building_id,
            status="queued",
            message="Pipeline queued for background processing",
            snapshot_id=None,
        )

    # Run synchronously
    try:
        snapshot = await service.run_pipeline_for_building(db, building_id, force)

        return PipelineRunResponse(
            building_id=building_id,
            status="completed",
            message=f"Pipeline completed in {snapshot.run_at}",
            snapshot_id=snapshot.id,
            risk_score=snapshot.risk_score,
            risk_tier=snapshot.risk_tier,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


@router.post("/insurers/{insurer_id}/run", response_model=list[PipelineRunResponse])
async def run_pipeline_for_insurer(
    insurer_id: int,
    request: PipelineRunRequest | None = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    service: PipelineService = Depends(get_pipeline_service),
):
    """Run pipeline for all buildings belonging to an insurer.

    Args:
        insurer_id: ID of insurer
        request: Optional run configuration
        background_tasks: FastAPI background tasks
        db: Database session
        service: Pipeline service

    Returns:
        List of pipeline run statuses
    """
    from sqlalchemy import select

    # Get all building IDs for insurer
    result = await db.execute(select(Building.id).where(Building.insurer_id == insurer_id))
    building_ids = [row[0] for row in result.all()]

    if not building_ids:
        raise HTTPException(status_code=404, detail=f"No buildings found for insurer {insurer_id}")

    concurrency = request.concurrency if request else 3

    # Always run insurers in background due to volume
    async def run_batch():
        async for session in get_db():
            try:
                await service.run_pipeline_for_buildings(
                    session, building_ids, concurrency=concurrency
                )
            except Exception as e:
                import logging

                logging.error(f"Batch pipeline failed for insurer {insurer_id}: {e}")

    background_tasks.add_task(run_batch)

    return [
        PipelineRunResponse(
            building_id=bid,
            status="queued",
            message=f"Queued for batch processing (position {i + 1}/{len(building_ids)})",
            snapshot_id=None,
        )
        for i, bid in enumerate(building_ids)
    ]


@router.get("/buildings/{building_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(
    building_id: int,
    db: AsyncSession = Depends(get_db),
    service: PipelineService = Depends(get_pipeline_service),
):
    """Get latest pipeline status for a building.

    Args:
        building_id: Building ID
        db: Database session
        service: Pipeline service

    Returns:
        Current status and latest snapshot info
    """
    from sqlalchemy import select
    from app.models.snapshot import Snapshot
    from app.models.building import Building

    # Get building
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalar_one_or_none()

    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Get latest snapshot
    result = await db.execute(
        select(Snapshot)
        .where(Snapshot.building_id == building_id)
        .order_by(Snapshot.run_at.desc())
        .limit(1)
    )
    latest_snapshot = result.scalar_one_or_none()

    return PipelineStatusResponse(
        building_id=building_id,
        address=building.address,
        current_status=building.status,
        current_score=building.risk_score,
        current_tier=building.risk_tier,
        last_run=latest_snapshot.run_at if latest_snapshot else None,
        total_snapshots=await _count_snapshots(db, building_id),
        needs_review=building.status == "needs_review",
    )


@router.get("/buildings/{building_id}/evidence", response_model=BuildingEvidenceResponse)
async def get_building_evidence(
    building_id: int,
    snapshot_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    service: PipelineService = Depends(get_pipeline_service),
):
    """Get evidence items for a building.

    Args:
        building_id: Building ID
        snapshot_id: Specific snapshot, or latest if None
        db: Database session
        service: Pipeline service

    Returns:
        List of evidence items with details
    """
    evidence_items = await service.get_building_evidence(db, building_id, snapshot_id)

    return BuildingEvidenceResponse(
        building_id=building_id,
        snapshot_id=snapshot_id,
        evidence_count=len(evidence_items),
        evidence=[
            {
                "id": e.id,
                "signal_type": e.signal_type,
                "description": e.description,
                "weight": e.weight,
                "raw_data": e.raw_data,
            }
            for e in evidence_items
        ],
    )


@router.get("/buildings/{building_id}/snapshots", response_model=BuildingSnapshotsResponse)
async def get_building_snapshots(
    building_id: int,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    service: PipelineService = Depends(get_pipeline_service),
):
    """Get snapshot history for a building.

    Args:
        building_id: Building ID
        limit: Max snapshots to return
        db: Database session
        service: Pipeline service

    Returns:
        List of historical snapshots
    """
    snapshots = await service.get_building_snapshots(db, building_id, limit)

    return BuildingSnapshotsResponse(
        building_id=building_id,
        snapshot_count=len(snapshots),
        snapshots=[
            {
                "id": s.id,
                "run_at": s.run_at,
                "risk_score": s.risk_score,
                "risk_tier": s.risk_tier,
                "has_vision": s.street_view_analysis is not None,
                "has_companies": s.companies_house_data is not None,
            }
            for s in snapshots
        ],
    )


async def _count_snapshots(db: AsyncSession, building_id: int) -> int:
    """Count total snapshots for building."""
    from sqlalchemy import select, func
    from app.models.snapshot import Snapshot

    result = await db.execute(select(func.count()).where(Snapshot.building_id == building_id))
    return result.scalar()
