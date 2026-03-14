import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import async_session
from app.models.building import Building, BuildingStatus
from app.models.evidence_item import EvidenceItem
from app.models.snapshot import Snapshot
from app.pipeline.geocode import geocode
from app.pipeline.companies_house import lookup_company
from app.pipeline.places import search_place
from app.pipeline.street_view import fetch_street_view_images
from app.pipeline.vision import analyze_images
from app.pipeline.licensing import check_licensing
from app.pipeline.scoring import calculate_risk_score, create_evidence_items
from app.pipeline.change_detect import detect_changes

logger = logging.getLogger(__name__)

# Limit concurrent pipeline runs to avoid API rate limits
_semaphore = asyncio.Semaphore(5)


async def run_pipeline(building_id: int) -> None:
    """Run the full intelligence pipeline for a building."""
    async with _semaphore:
        async with async_session() as db:
            try:
                await _run_pipeline_inner(building_id, db)
            except Exception:
                logger.exception(f"Pipeline failed for building {building_id}")


async def _run_pipeline_inner(building_id: int, db) -> None:
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalar_one_or_none()
    if not building:
        logger.error(f"Building {building_id} not found")
        return

    api_key = settings.GOOGLE_API_KEY
    ch_key = settings.COMPANIES_HOUSE_API_KEY

    # Step 1: Geocode
    geo_result = await geocode(building.address, api_key)
    geocode_data = geo_result.get("data")
    if geo_result.get("error"):
        logger.warning(f"Geocode error for {building_id}: {geo_result['error']}")

    # Update building with geocode data
    if geocode_data:
        building.place_id = geocode_data.get("place_id")
        building.lat = geocode_data.get("lat")
        building.lng = geocode_data.get("lng")

    # Step 2: Companies House
    ch_result = await lookup_company(building.address, ch_key)
    companies_house_data = ch_result.get("data")
    if ch_result.get("error"):
        logger.warning(f"Companies House error for {building_id}: {ch_result['error']}")

    # Step 3: Google Places
    places_data = None
    if building.place_id:
        places_result = await search_place(building.place_id, api_key)
        places_data = places_result.get("data")
        if places_result.get("error"):
            logger.warning(f"Places error for {building_id}: {places_result['error']}")

    # Step 4: Street View + Vision
    street_view_analysis = None
    if building.lat and building.lng:
        sv_result = await fetch_street_view_images(building.lat, building.lng, api_key)
        sv_data = sv_result.get("data")
        if sv_data and sv_data.get("image_count", 0) > 0:
            vision_result = await analyze_images(sv_data["images"], settings.GEMINI_MODEL)
            street_view_analysis = vision_result.get("data")
            if vision_result.get("error"):
                logger.warning(f"Vision error for {building_id}: {vision_result['error']}")

    # Step 5: Licensing check
    licensing_data = None
    if building.lat and building.lng:
        lic_result = await check_licensing(building.lat, building.lng)
        licensing_data = lic_result.get("data")
        if lic_result.get("error"):
            logger.warning(f"Licensing error for {building_id}: {lic_result['error']}")

    # Get previous snapshot for change detection
    prev_result = await db.execute(
        select(Snapshot)
        .where(Snapshot.building_id == building_id)
        .order_by(Snapshot.run_at.desc())
        .limit(1)
    )
    previous_snapshot = prev_result.scalar_one_or_none()
    previous_vision = None
    if previous_snapshot:
        previous_vision = previous_snapshot.street_view_analysis

    # Generate evidence items
    evidence_data = create_evidence_items(
        vision_data=street_view_analysis,
        company_data=companies_house_data,
        places_data=places_data,
        licensing_data=licensing_data,
        property_class=building.property_class,
        previous_vision=previous_vision,
    )

    # Calculate score
    score, tier = calculate_risk_score(evidence_data)

    # Create snapshot
    snapshot = Snapshot(
        building_id=building_id,
        geocode_data=geocode_data,
        companies_house_data=companies_house_data,
        places_data=places_data,
        street_view_analysis=street_view_analysis,
        licensing_data=licensing_data,
        risk_score=score,
        risk_tier=tier,
    )
    db.add(snapshot)
    await db.flush()

    # Create evidence items
    for item_data in evidence_data:
        item = EvidenceItem(
            snapshot_id=snapshot.id,
            signal_type=item_data["signal_type"],
            description=item_data["description"],
            weight=item_data["weight"],
            raw_data=item_data.get("raw_data"),
        )
        db.add(item)

    # Change detection
    if previous_snapshot:
        changes = detect_changes(
            {
                "street_view_analysis": street_view_analysis,
                "companies_house_data": companies_house_data,
                "places_data": places_data,
                "licensing_data": licensing_data,
            },
            {
                "street_view_analysis": previous_snapshot.street_view_analysis,
                "companies_house_data": previous_snapshot.companies_house_data,
                "places_data": previous_snapshot.places_data,
                "licensing_data": previous_snapshot.licensing_data,
            },
        )
        if changes["changed"]:
            building.status = BuildingStatus.NEEDS_REVIEW.value

    # Update building
    building.risk_score = score
    building.risk_tier = tier
    await db.commit()
