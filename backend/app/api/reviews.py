from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.building import Building, BuildingStatus
from app.models.review import Review, ReviewAction
from app.schemas.review import ReviewCreate, ReviewResponse

router = APIRouter(prefix="/api/buildings", tags=["reviews"])


@router.post("/{building_id}/review", response_model=ReviewResponse, status_code=201)
async def create_review(
    building_id: int,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalar_one_or_none()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    if data.action not in [a.value for a in ReviewAction]:
        raise HTTPException(status_code=400, detail="Invalid action")

    review = Review(
        building_id=building_id,
        reviewer_name=data.reviewer_name,
        action=data.action,
        notes=data.notes,
    )
    db.add(review)

    # Update building status based on review action
    if data.action == ReviewAction.ESCALATED.value:
        building.status = BuildingStatus.ESCALATED.value
        building.assigned_to = "escalated"
    elif data.action == ReviewAction.CLEARED.value:
        building.status = BuildingStatus.CLEARED.value
    elif data.action == ReviewAction.NOTED.value:
        building.status = BuildingStatus.MONITORING.value

    await db.commit()
    await db.refresh(review)
    return review


@router.get("/{building_id}/reviews", response_model=list[ReviewResponse])
async def list_reviews(building_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .where(Review.building_id == building_id)
        .order_by(Review.created_at.desc())
    )
    return list(result.scalars().all())
