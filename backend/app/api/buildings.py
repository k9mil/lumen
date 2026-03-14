from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.building import Building
from app.models.snapshot import Snapshot
from app.schemas.building import (
    BuildingListResponse,
    BuildingResponse,
    DashboardBuildingResponse,
    DashboardResponse,
    SignalResponse,
)
from app.schemas.evidence import DiffItem, EvidenceItemResponse, EvidenceResponse
from app.schemas.snapshot import SnapshotResponse
from app.services.building_service import get_building, get_building_evidence, list_buildings

router = APIRouter(prefix="/api/buildings", tags=["buildings"])

# Signal type to human-readable source mapping
SIGNAL_SOURCE_MAP = {
    "cv_classification": "Vision Model",
    "sic_mismatch": "Companies House",
    "licensing": "Licensing Board",
    "keyword_hit": "Street View",
}

# Signal type to severity mapping based on weight
def _weight_to_severity(weight: float) -> str:
    if weight >= 40:
        return "critical"
    elif weight >= 25:
        return "high"
    elif weight >= 15:
        return "medium"
    return "low"


def _compute_risk_trend(snapshots: list) -> str:
    """Compute trend from snapshot history."""
    if len(snapshots) < 2:
        return "stable"
    latest = snapshots[0].risk_score
    previous = snapshots[1].risk_score
    if latest > previous + 5:
        return "up"
    elif latest < previous - 5:
        return "down"
    return "stable"


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard_buildings(db: AsyncSession = Depends(get_db)):
    """Return all buildings in the shape the frontend dashboard expects,
    including signals from latest snapshot."""
    # Get all buildings
    result = await db.execute(
        select(Building).order_by(Building.risk_score.desc())
    )
    buildings = list(result.scalars().all())

    dashboard_buildings = []
    for building in buildings:
        # Get latest 2 snapshots with evidence items
        snap_result = await db.execute(
            select(Snapshot)
            .where(Snapshot.building_id == building.id)
            .options(selectinload(Snapshot.evidence_items))
            .order_by(Snapshot.run_at.desc())
            .limit(2)
        )
        snapshots = list(snap_result.scalars().all())

        # Build signals from evidence items
        signals = []
        if snapshots:
            latest = snapshots[0]
            for item in latest.evidence_items:
                signals.append(SignalResponse(
                    id=f"s{item.id}",
                    source=SIGNAL_SOURCE_MAP.get(item.signal_type, item.signal_type),
                    severity=_weight_to_severity(item.weight),
                    description=item.description,
                    timestamp=latest.run_at.isoformat() + "Z",
                ))

        risk_trend = _compute_risk_trend(snapshots)

        dashboard_buildings.append(DashboardBuildingResponse(
            id=str(building.id),
            address=building.address,
            tenant=building.tenant or "",
            riskScore=building.risk_score,
            riskTrend=risk_trend,
            riskTier=building.risk_tier,
            status=building.status,
            propertyType=building.property_type or building.property_class or "",
            listed=building.listed,
            registeredUse=building.registered_use or "",
            detectedUse=building.detected_use or "",
            useMismatch=building.use_mismatch,
            lat=building.lat or 0.0,
            lng=building.lng or 0.0,
            lastUpdated=building.updated_at.isoformat() + "Z",
            assignedTo=building.assigned_to,
            signals=signals,
        ))

    return DashboardResponse(buildings=dashboard_buildings, total=len(dashboard_buildings))


@router.get("/", response_model=BuildingListResponse)
async def list_buildings_route(
    insurer_id: int | None = None,
    status: str | None = None,
    risk_tier: str | None = None,
    sort_by: str = "risk_score",
    order: str = "desc",
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    buildings, total = await list_buildings(
        db,
        insurer_id=insurer_id,
        status=status,
        risk_tier=risk_tier,
        sort_by=sort_by,
        order=order,
        skip=skip,
        limit=limit,
    )
    return BuildingListResponse(buildings=buildings, total=total)


@router.get("/{building_id}", response_model=BuildingResponse)
async def get_building_route(building_id: int, db: AsyncSession = Depends(get_db)):
    building = await get_building(db, building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.get("/{building_id}/evidence", response_model=EvidenceResponse | None)
async def get_evidence_route(building_id: int, db: AsyncSession = Depends(get_db)):
    building = await get_building(db, building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    snapshot, evidence_items, diff = await get_building_evidence(db, building_id)
    if not snapshot:
        return None

    return EvidenceResponse(
        snapshot=SnapshotResponse.model_validate(snapshot),
        evidence_items=[EvidenceItemResponse.model_validate(e) for e in evidence_items],
        diff=[DiffItem(**d) for d in diff] if diff else None,
    )


@router.post("/{building_id}/refresh", status_code=202)
async def refresh_building(
    building_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    building = await get_building(db, building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    from app.pipeline.orchestrator import run_pipeline

    background_tasks.add_task(run_pipeline, building_id)
    return {"status": "pipeline_started", "building_id": building_id}
