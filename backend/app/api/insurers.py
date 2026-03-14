from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.building import Building
from app.models.insurer import Insurer
from app.schemas.insurer import InsurerCreate, InsurerResponse
from app.schemas.building import BuildingBulkUpload, BuildingResponse

router = APIRouter(prefix="/api/insurers", tags=["insurers"])


@router.post("/", response_model=InsurerResponse, status_code=201)
async def create_insurer(data: InsurerCreate, db: AsyncSession = Depends(get_db)):
    insurer = Insurer(name=data.name)
    db.add(insurer)
    await db.commit()
    await db.refresh(insurer)
    return insurer


@router.get("/", response_model=list[InsurerResponse])
async def list_insurers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Insurer).order_by(Insurer.created_at.desc()))
    return list(result.scalars().all())


@router.get("/{insurer_id}", response_model=InsurerResponse)
async def get_insurer(insurer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Insurer).where(Insurer.id == insurer_id))
    insurer = result.scalar_one_or_none()
    if not insurer:
        raise HTTPException(status_code=404, detail="Insurer not found")
    return insurer


@router.post("/{insurer_id}/buildings", response_model=list[BuildingResponse], status_code=201)
async def bulk_upload_buildings(
    insurer_id: int,
    data: BuildingBulkUpload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Verify insurer exists
    result = await db.execute(select(Insurer).where(Insurer.id == insurer_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Insurer not found")

    buildings = []
    for b in data.buildings:
        building = Building(
            insurer_id=insurer_id,
            address=b.address,
            property_class=b.property_class,
        )
        db.add(building)
        buildings.append(building)

    await db.commit()
    for b in buildings:
        await db.refresh(b)

    # Trigger pipeline for each building in background
    from app.pipeline.orchestrator import run_pipeline

    for b in buildings:
        background_tasks.add_task(run_pipeline, b.id)

    return buildings
