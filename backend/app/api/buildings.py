from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.building import BuildingListResponse, BuildingResponse
from app.schemas.evidence import DiffItem, EvidenceItemResponse, EvidenceResponse
from app.schemas.snapshot import SnapshotResponse
from app.services.building_service import get_building, get_building_evidence, list_buildings

router = APIRouter(prefix="/api/buildings", tags=["buildings"])


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
