"""LicensingAgent - checks for licensed premises in vicinity."""

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class LicensingAgent(BaseAgent):
    """Agent for checking licensed premises (alcohol/entertainment licenses).

    Input: {"lat": 55.8592, "lng": -4.2584, "radius_m": 100}
    Output: {"found": True, "premises": [{"name": "...", "type": "...", "distance_m": 45.2}]}
    """

    name = "licensing"

    _geojson_cache: dict | None = None

    def __init__(self, config: AgentConfig, geojson_path: str | None = None):
        super().__init__(config)
        self.geojson_path = geojson_path

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate lat/lng and optional radius."""
        lat = data.get("lat")
        lng = data.get("lng")

        if lat is None or lng is None:
            return False, "Missing required fields: lat and lng"

        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except (TypeError, ValueError):
            return False, "lat and lng must be valid numbers"

        if not (-90 <= lat_f <= 90):
            return False, "lat must be between -90 and 90"
        if not (-180 <= lng_f <= 180):
            return False, "lng must be between -180 and 180"

        if "radius_m" in data:
            try:
                radius = float(data["radius_m"])
                if radius <= 0 or radius > 5000:
                    return False, "radius_m must be between 0 and 5000"
            except (TypeError, ValueError):
                return False, "radius_m must be a number"

        return True, ""

    def _load_geojson(self) -> dict:
        """Load licensing GeoJSON data (cached)."""
        if LicensingAgent._geojson_cache is not None:
            return LicensingAgent._geojson_cache

        if self.geojson_path:
            path = Path(self.geojson_path)
        else:
            # Default: look in data directory relative to backend
            path = (
                Path(__file__).resolve().parents[4] / "data" / "glasgow_licensed_premises.geojson"
            )

        if path.exists():
            with open(path) as f:
                data = json.load(f)
        else:
            data = {"type": "FeatureCollection", "features": []}

        LicensingAgent._geojson_cache = data
        return data

    @staticmethod
    def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance in meters between two points."""
        R = 6371000  # Earth radius in meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lng2 - lng1)

        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Check for licensed premises nearby."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        start_time = datetime.utcnow()

        lat = float(input_data["lat"])
        lng = float(input_data["lng"])
        radius_m = float(input_data.get("radius_m", 100))

        try:
            geojson = self._load_geojson()
            nearby = []

            for feature in geojson.get("features", []):
                geom = feature.get("geometry", {})
                coords = geom.get("coordinates", [])

                if len(coords) < 2:
                    continue

                # GeoJSON uses [lng, lat] order
                feat_lng, feat_lat = coords[0], coords[1]
                distance = self._haversine(lat, lng, feat_lat, feat_lng)

                if distance <= radius_m:
                    props = feature.get("properties", {})
                    nearby.append(
                        {
                            "name": props.get("TradingName") or props.get("name") or "Unknown",
                            "type": props.get("LicenceType") or props.get("type") or "unknown",
                            "licence_status": props.get("Status", "unknown"),
                            "distance_m": round(distance, 1),
                        }
                    )

            # Sort by distance
            nearby.sort(key=lambda x: x["distance_m"])

            output = {
                "found": len(nearby) > 0,
                "premises": nearby,
                "search_radius_m": radius_m,
                "total_checked": len(geojson.get("features", [])),
            }

            end_time = datetime.utcnow()
            return Result.ok(
                output, agent=self.name, lat=lat, lng=lng, matches_found=len(nearby)
            ).with_timing(start_time, end_time)

        except Exception as e:
            return Result.fail(f"Licensing check failed: {str(e)}", agent=self.name)
