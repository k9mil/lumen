"""CrimeAgent - checks crime statistics from UK Police API.

API: https://data.police.uk/
Free, no API key required.

Note: Police UK API uses a 1km grid system. We fetch all crimes in the
1km grid square containing the coordinates, then filter by distance.
"""

import httpx
import math
from datetime import datetime, timedelta
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class CrimeAgent(BaseAgent):
    """Agent for checking crime statistics.

    Input: {"lat": 55.8609, "lng": -4.2514, "radius_m": 500}
    Output: {
        "found": True,
        "total_crimes": 45,
        "period_months": 8,
        "by_category": {
            "burglary": 3,
            "criminal_damage_arson": 2,
            "theft": 12
        },
        "commercial_risk_score": 15
    }
    """

    name = "crime"

    BASE_URL = "https://data.police.uk/api"

    # Crime categories relevant to commercial properties
    RELEVANT_CATEGORIES = [
        "burglary",
        "criminal-damage-arson",
        "theft",
        "shoplifting",
        "violent-crime",
    ]

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate coordinates."""
        if not data.get("lat") or not data.get("lng"):
            return False, "Missing coordinates"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Fetch crime statistics for area."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        start_time = datetime.utcnow()

        lat = float(input_data["lat"])
        lng = float(input_data["lng"])
        radius_m = float(input_data.get("radius_m", 500))

        try:
            # Calculate date range (last 8 months)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=240)  # ~8 months

            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                # Get available months
                months_response = await client.get(f"{self.BASE_URL}/crimes-street-dates")
                months_response.raise_for_status()
                available_months = months_response.json()

                # Get last 8 months of data
                months_to_fetch = (
                    available_months[:8] if len(available_months) >= 8 else available_months
                )

                all_crimes = []
                for month_data in months_to_fetch:
                    month = month_data.get("date")

                    # Fetch crimes for this month at location
                    crimes_response = await client.get(
                        f"{self.BASE_URL}/crimes-street/all-crime",
                        params={"lat": lat, "lng": lng, "date": month},
                    )

                    if crimes_response.status_code == 200:
                        crimes = crimes_response.json()
                        all_crimes.extend(crimes)

                # Filter by distance (crude filter - within radius)
                nearby_crimes = [
                    crime for crime in all_crimes if self._is_nearby(crime, lat, lng, radius_m)
                ]

                # Categorize
                categories = {}
                for crime in nearby_crimes:
                    cat = crime.get("category", "unknown")
                    categories[cat] = categories.get(cat, 0) + 1

                # Calculate risk
                risk_assessment = self._calculate_risk(categories, radius_m)

                output = {
                    "found": len(nearby_crimes) > 0,
                    "total_crimes": len(nearby_crimes),
                    "period_months": len(months_to_fetch),
                    "date_range": {
                        "from": months_to_fetch[-1]["date"] if months_to_fetch else None,
                        "to": months_to_fetch[0]["date"] if months_to_fetch else None,
                    },
                    "by_category": categories,
                    "relevant_categories": {
                        k: v for k, v in categories.items() if k in self.RELEVANT_CATEGORIES
                    },
                    "radius_m": radius_m,
                    "risk_assessment": risk_assessment,
                }

                end_time = datetime.utcnow()
                return Result.ok(output, agent=self.name, lat=lat, lng=lng).with_timing(
                    start_time, end_time
                )

        except httpx.TimeoutException:
            return Result.fail("Police API timeout", agent=self.name)
        except Exception as e:
            return Result.fail(f"Crime check failed: {str(e)}", agent=self.name)

    def _is_nearby(self, crime: dict, lat: float, lng: float, radius_m: float) -> bool:
        """Check if crime is within radius (crude approximation)."""
        location = crime.get("location", {})
        crime_lat = location.get("latitude")
        crime_lng = location.get("longitude")

        if not crime_lat or not crime_lng:
            return True  # Include if location unknown

        distance = self._haversine(lat, lng, float(crime_lat), float(crime_lng))
        return distance <= radius_m

    def _haversine(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance in meters."""
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lng2 - lng1)

        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _calculate_risk(self, categories: dict, radius_m: float) -> dict:
        """Calculate crime-based risk score."""
        score = 0
        reasons = []

        # Commercial burglary risk
        burglary = categories.get("burglary", 0)
        if burglary >= 3:
            score += 20
            reasons.append(f"High commercial burglary rate ({burglary} incidents)")
        elif burglary >= 1:
            score += 10
            reasons.append(f"Commercial burglary detected ({burglary} incidents)")

        # Theft/shoplifting
        theft = categories.get("theft", 0) + categories.get("shoplifting", 0)
        if theft >= 10:
            score += 15
            reasons.append(f"High theft rate ({theft} incidents)")
        elif theft >= 5:
            score += 8
            reasons.append(f"Moderate theft rate ({theft} incidents)")

        # Criminal damage
        damage = categories.get("criminal-damage-arson", 0)
        if damage >= 2:
            score += 12
            reasons.append(f"Criminal damage incidents ({damage})")

        return {
            "score": min(score, 40),  # Cap at 40 points
            "level": "high" if score >= 20 else "medium" if score >= 10 else "low",
            "reasons": reasons,
        }
