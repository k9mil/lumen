"""Pipeline Orchestrator - coordinates agents for building intelligence.

Flow: Geocode → Companies House → Street View → Vision → Licensing → Food Hygiene → Crime → Reviews → Scoring → Change Detection
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .core.types import Result, AgentConfig
from .agents.geocode import GeocodeAgent
from .agents.companies_house import CompaniesHouseAgent
from .agents.places import PlacesAgent
from .agents.street_view import StreetViewAgent
from .agents.vision import VisionAgent
from .agents.licensing import LicensingAgent
from .agents.scoring import ScoringAgent
from .agents.change_detection import ChangeDetectionAgent
from .agents.food_hygiene import FoodHygieneAgent
from .agents.crime import CrimeAgent
from .agents.review_sentiment import ReviewSentimentAgent

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
    places_data: dict | None = None
    street_view_data: dict | None = None
    vision_data: dict | None = None
    licensing_data: dict | None = None
    food_hygiene_data: dict | None = None
    crime_data: dict | None = None
    review_data: dict | None = None

    # Derived outputs
    score: int = 0
    tier: str = "low"
    confidence: float = 0.0
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
            "places": self.places_data,
            "street_view": self.street_view_data,
            "vision": self.vision_data,
            "licensing": self.licensing_data,
            "food_hygiene": self.food_hygiene_data,
            "crime": self.crime_data,
            "reviews": self.review_data,
            "score": self.score,
            "tier": self.tier,
            "confidence": self.confidence,
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
        self.places_agent = PlacesAgent(config)
        self.street_view_agent = StreetViewAgent(config)
        self.vision_agent = VisionAgent(config)
        self.licensing_agent = LicensingAgent(config)
        self.scoring_agent = ScoringAgent(config)
        self.change_detection_agent = ChangeDetectionAgent(config)

        # New agents
        self.food_hygiene_agent = FoodHygieneAgent(config)
        self.crime_agent = CrimeAgent(config)
        self.review_sentiment_agent = ReviewSentimentAgent(config)

    async def run_pipeline(
        self,
        building_id: int,
        address: str,
        property_class: str,
        previous_snapshot: dict | None = None,
    ) -> PipelineResult:
        """Run the full pipeline for a building."""
        async with _pipeline_semaphore:
            result = PipelineResult(success=True, building_id=building_id)
            start_time = datetime.utcnow()

            logger.info(f"Starting pipeline for building {building_id}: {address}")

            try:
                # Step 1: Geocode (REQUIRED)
                await self._run_geocode(result, address)
                if not result.geocode_data:
                    result.success = False
                    result.errors.append("Geocoding failed - cannot continue without coordinates")
                    return self._finalize(result, start_time)

                lat = result.geocode_data["lat"]
                lng = result.geocode_data["lng"]
                place_id = result.geocode_data.get("place_id")

                # Step 2-6: Parallel execution of external data sources
                await asyncio.gather(
                    self._run_companies_house(result, address),
                    self._run_food_hygiene(result, address),
                    self._run_crime(result, lat, lng),
                    self._run_licensing(result, lat, lng),
                )

                # Step 7: Places API (need place_id)
                if place_id:
                    await self._run_places(result, place_id)

                # Step 8-9: Street View + Vision (sequential)
                await self._run_street_view(result, lat, lng)
                if result.street_view_data and result.street_view_data.get("images"):
                    await self._run_vision(result)
                else:
                    logger.warning("Skipping vision analysis - no street view images")
                    result.errors.append("No street view images for vision analysis")

                # Step 10: Review sentiment (need places data)
                if result.places_data:
                    await self._run_review_sentiment(result)

                # Step 11: Scoring
                await self._run_scoring(result, property_class, previous_snapshot)

                # Step 12-13: Change Detection
                if previous_snapshot:
                    await self._run_change_detection(result, previous_snapshot)

            except Exception as e:
                logger.exception(f"Pipeline failed for building {building_id}")
                result.success = False
                result.errors.append(f"Pipeline error: {str(e)}")

            return self._finalize(result, start_time)

    async def _run_geocode(self, result: PipelineResult, address: str) -> None:
        """Step 1: Geocode the address."""
        logger.info("Step 1/11: Geocoding...")
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
        logger.info("Step 2/11: Companies House lookup...")
        ch_result = await self.companies_house_agent.execute({"address": address})

        if ch_result.success:
            result.companies_house_data = ch_result.data
            companies = ch_result.data.get("companies", [])
            logger.info(f"  ✓ Found {len(companies)} companies")
        else:
            logger.warning(f"  ⚠ Companies House failed: {ch_result.error}")
            result.errors.append(f"Companies House: {ch_result.error}")

    async def _run_food_hygiene(self, result: PipelineResult, address: str) -> None:
        """Step 3: Check food hygiene ratings."""
        logger.info("Step 3/11: Food hygiene ratings...")

        address_parts = address.split(",")
        business_name = address_parts[0].strip() if address_parts else ""
        postcode = address_parts[-1].strip() if len(address_parts) > 1 else ""

        fh_result = await self.food_hygiene_agent.execute(
            {"business_name": business_name, "address": address, "postcode": postcode}
        )

        if fh_result.success:
            result.food_hygiene_data = fh_result.data
            if fh_result.data.get("found"):
                rating = fh_result.data.get("best_match", {}).get("rating")
                logger.info(f"  ✓ Food hygiene rating: {rating}/5")
            else:
                logger.info("  ✓ No food hygiene records")
        else:
            logger.warning(f"  ⚠ Food hygiene check failed: {fh_result.error}")
            result.errors.append(f"Food hygiene: {fh_result.error}")

    async def _run_crime(self, result: PipelineResult, lat: float, lng: float) -> None:
        """Step 4: Check crime statistics."""
        logger.info("Step 4/11: Crime statistics...")
        crime_result = await self.crime_agent.execute({"lat": lat, "lng": lng, "radius_m": 500})

        if crime_result.success:
            result.crime_data = crime_result.data
            total = crime_result.data.get("total_crimes", 0)
            logger.info(f"  ✓ Crime data: {total} incidents (8 months)")
        else:
            logger.warning(f"  ⚠ Crime check failed: {crime_result.error}")
            result.errors.append(f"Crime: {crime_result.error}")

    async def _run_licensing(self, result: PipelineResult, lat: float, lng: float) -> None:
        """Step 5: Check for licensed premises."""
        logger.info("Step 5/11: Licensing check...")
        lic_result = await self.licensing_agent.execute({"lat": lat, "lng": lng, "radius_m": 100})

        if lic_result.success:
            result.licensing_data = lic_result.data
            found = lic_result.data.get("found", False)
            count = len(lic_result.data.get("premises", []))
            logger.info(
                f"  ✓ Licensing: {count} premises nearby"
                if found
                else "  ✓ No licensed premises nearby"
            )
        else:
            logger.warning(f"  ⚠ Licensing check failed: {lic_result.error}")
            result.errors.append(f"Licensing: {lic_result.error}")

    async def _run_places(self, result: PipelineResult, place_id: str) -> None:
        """Step 6: Fetch Google Places data."""
        logger.info("Step 6/11: Google Places...")
        places_result = await self.places_agent.execute({"place_id": place_id})

        if places_result.success:
            result.places_data = places_result.data
            name = places_result.data.get("trading_name", "")
            logger.info(f"  ✓ Places: {name}")
        else:
            logger.warning(f"  ⚠ Places failed: {places_result.error}")
            result.errors.append(f"Places: {places_result.error}")

    async def _run_street_view(self, result: PipelineResult, lat: float, lng: float) -> None:
        """Step 7: Fetch street view images."""
        logger.info("Step 7/11: Street View images...")
        sv_result = await self.street_view_agent.execute({"lat": lat, "lng": lng})

        if sv_result.success:
            result.street_view_data = sv_result.data
            count = sv_result.data.get("image_count", 0)
            logger.info(f"  ✓ Fetched {count}/4 images")
        else:
            logger.warning(f"  ⚠ Street view failed: {sv_result.error}")
            result.errors.append(f"Street view: {sv_result.error}")

    async def _run_vision(self, result: PipelineResult) -> None:
        """Step 8: Multi-pass vision analysis."""
        logger.info("Step 8/11: Vision analysis (4-pass)...")
        images = result.street_view_data.get("images", {})
        vision_result = await self.vision_agent.execute({"images": images})

        if vision_result.success:
            result.vision_data = vision_result.data
            occupier = vision_result.data.get("occupier_type", "unknown")
            confidence = vision_result.data.get("confidence", 0)
            passes = vision_result.metadata.get("passes_completed", 0)
            logger.info(f"  ✓ Vision: {occupier} ({confidence:.0%} confidence, {passes} passes)")
        else:
            logger.warning(f"  ⚠ Vision analysis failed: {vision_result.error}")
            result.errors.append(f"Vision: {vision_result.error}")

    async def _run_review_sentiment(self, result: PipelineResult) -> None:
        """Step 9: Analyze review sentiment."""
        logger.info("Step 9/11: Review sentiment...")

        reviews = result.places_data.get("review_snippets", [])
        business_name = result.places_data.get("trading_name", "")

        if not reviews:
            logger.info("  ℹ No reviews to analyze")
            return

        sentiment_result = await self.review_sentiment_agent.execute(
            {"business_name": business_name, "reviews": reviews}
        )

        if sentiment_result.success:
            result.review_data = sentiment_result.data
            if sentiment_result.data.get("found"):
                sentiment = sentiment_result.data.get("overall_sentiment", "unknown")
                score = sentiment_result.data.get("sentiment_score", 0)
                logger.info(f"  ✓ Reviews: {sentiment} sentiment ({score:+.1f})")
            else:
                logger.info("  ℹ No review analysis available")
        else:
            logger.warning(f"  ⚠ Review analysis failed: {sentiment_result.error}")
            result.errors.append(f"Reviews: {sentiment_result.error}")

    async def _run_scoring(
        self,
        result: PipelineResult,
        property_class: str,
        previous_snapshot: dict | None,
    ) -> None:
        """Step 10: Calculate risk score."""
        logger.info("Step 10/11: Risk scoring...")

        previous_vision = None
        if previous_snapshot and previous_snapshot.get("vision_data"):
            previous_vision = previous_snapshot["vision_data"]

        scoring_data = {
            "vision_data": result.vision_data,
            "companies_house_data": result.companies_house_data,
            "food_hygiene_data": result.food_hygiene_data,
            "review_data": result.review_data,
            "crime_data": result.crime_data,
            "licensing_data": result.licensing_data,
            "places_data": result.places_data,
            "property_class": property_class,
            "previous_vision": previous_vision if result.vision_data else None,
        }

        scoring_result = await self.scoring_agent.execute(scoring_data)

        if scoring_result.success:
            result.score = scoring_result.data["score"]
            result.tier = scoring_result.data["tier"]
            result.confidence = scoring_result.data.get("confidence", 0.0)
            result.evidence_items = scoring_result.data.get("evidence_items", [])
            logger.info(
                f"  ✓ Score: {result.score}/100 ({result.tier.upper()}, {result.confidence:.0%} confidence)"
            )
        else:
            logger.error(f"  ✗ Scoring failed: {scoring_result.error}")
            result.errors.append(f"Scoring: {scoring_result.error}")

    async def _run_change_detection(
        self,
        result: PipelineResult,
        previous_snapshot: dict,
    ) -> None:
        """Step 11: Detect changes from previous snapshot."""
        logger.info("Step 11/11: Change detection...")

        current = {
            "vision": result.vision_data or {},
            "companies": result.companies_house_data or {"companies": []},
            "places": result.places_data or {"trading_name": "", "types": []},
            "licensing": result.licensing_data or {"found": False},
            "food_hygiene": result.food_hygiene_data or {"found": False},
        }

        previous = {
            "vision": previous_snapshot.get("vision_data", {}),
            "companies": previous_snapshot.get("companies_house_data", {"companies": []}),
            "places": previous_snapshot.get("places_data", {"trading_name": "", "types": []}),
            "licensing": previous_snapshot.get("licensing_data", {"found": False}),
            "food_hygiene": previous_snapshot.get("food_hygiene_data", {"found": False}),
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

        result.success = result.geocode_data is not None and result.duration_ms > 0

        logger.info(
            f"Pipeline completed in {result.duration_ms:.0f}ms "
            f"- Score: {result.score}/100 ({result.tier}) "
            f"- Confidence: {result.confidence:.0%} "
            f"- Evidence: {len(result.evidence_items)} items "
            f"- Errors: {len(result.errors)}"
        )

        return result
