from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.building import Building
from app.models.insurer import Insurer
from app.models.snapshot import Snapshot


async def get_or_create_default_insurer(db: AsyncSession) -> Insurer:
    """Get the first insurer or create a default one."""
    result = await db.execute(select(Insurer).limit(1))
    insurer = result.scalar_one_or_none()
    if not insurer:
        insurer = Insurer(name="Default Insurer")
        db.add(insurer)
        await db.flush()
    return insurer


async def list_buildings(
    db: AsyncSession,
    *,
    insurer_id: int | None = None,
    status: str | None = None,
    risk_tier: str | None = None,
    sort_by: str = "risk_score",
    order: str = "desc",
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Building], int]:
    query = select(Building)
    count_query = select(func.count(Building.id))

    if insurer_id is not None:
        query = query.where(Building.insurer_id == insurer_id)
        count_query = count_query.where(Building.insurer_id == insurer_id)
    if status is not None:
        query = query.where(Building.status == status)
        count_query = count_query.where(Building.status == status)
    if risk_tier is not None:
        query = query.where(Building.risk_tier == risk_tier)
        count_query = count_query.where(Building.risk_tier == risk_tier)

    sort_col = getattr(Building, sort_by, Building.risk_score)
    if order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset(skip).limit(limit))
    return list(result.scalars().all()), total


async def get_building(db: AsyncSession, building_id: int) -> Building | None:
    result = await db.execute(select(Building).where(Building.id == building_id))
    return result.scalar_one_or_none()


async def create_building(
    db: AsyncSession,
    *,
    address: str,
    property_class: str = "",
    property_type: str | None = None,
    tenant: str | None = None,
    registered_use: str | None = None,
    listed: bool = False,
    insurer_id: int | None = None,
) -> Building:
    """Create a new building. If no insurer_id provided, uses the default insurer."""
    if insurer_id is None:
        insurer = await get_or_create_default_insurer(db)
        insurer_id = insurer.id

    building = Building(
        insurer_id=insurer_id,
        address=address,
        property_class=property_class,
        property_type=property_type,
        tenant=tenant,
        registered_use=registered_use,
        listed=listed,
        status="active",
        risk_score=0,
        risk_tier="low",
    )
    db.add(building)
    await db.flush()
    await db.refresh(building)
    return building


async def get_building_evidence(db: AsyncSession, building_id: int):
    """Get latest snapshot with evidence items, plus diff against previous snapshot."""
    result = await db.execute(
        select(Snapshot)
        .where(Snapshot.building_id == building_id)
        .options(selectinload(Snapshot.evidence_items))
        .order_by(Snapshot.run_at.desc())
        .limit(2)
    )
    snapshots = list(result.scalars().all())

    if not snapshots:
        return None, [], None

    latest = snapshots[0]
    evidence = latest.evidence_items
    diff = None

    if len(snapshots) == 2:
        diff = _compute_diff(latest, snapshots[1])

    return latest, evidence, diff


def _compute_diff(current: Snapshot, previous: Snapshot) -> list[dict]:
    diffs = []
    fields = [
        ("companies_house_data", "Company data"),
        ("places_data", "Places data"),
        ("street_view_analysis", "Street view analysis"),
        ("licensing_data", "Licensing data"),
    ]
    for field, label in fields:
        curr_val = getattr(current, field)
        prev_val = getattr(previous, field)
        if curr_val != prev_val:
            diffs.append(
                {
                    "field": label,
                    "old": prev_val,
                    "new": curr_val,
                    "severity": "warning",
                }
            )
    if current.risk_score != previous.risk_score:
        diffs.append(
            {
                "field": "Risk score",
                "old": previous.risk_score,
                "new": current.risk_score,
                "severity": "high" if current.risk_score > previous.risk_score else "info",
            }
        )
    return diffs
