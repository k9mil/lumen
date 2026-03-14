import json
import math
from pathlib import Path

_GEOJSON_CACHE: dict | None = None


def _load_geojson() -> dict:
    global _GEOJSON_CACHE
    if _GEOJSON_CACHE is None:
        path = Path(__file__).resolve().parents[3] / "data" / "glasgow_licensed_premises.geojson"
        if path.exists():
            with open(path) as f:
                _GEOJSON_CACHE = json.load(f)
        else:
            _GEOJSON_CACHE = {"type": "FeatureCollection", "features": []}
    return _GEOJSON_CACHE


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in metres between two points."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def check_licensing(lat: float, lng: float, radius_m: float = 100) -> dict:
    """Check for licensed premises within radius of a location."""
    try:
        geojson = _load_geojson()
        nearby = []

        for feature in geojson.get("features", []):
            geom = feature.get("geometry", {})
            coords = geom.get("coordinates", [])
            if len(coords) < 2:
                continue

            # GeoJSON is [lng, lat]
            feat_lng, feat_lat = coords[0], coords[1]
            distance = _haversine(lat, lng, feat_lat, feat_lng)

            if distance <= radius_m:
                props = feature.get("properties", {})
                nearby.append({
                    "name": props.get("name", props.get("TradingName", "Unknown")),
                    "type": props.get("type", props.get("LicenceType", "unknown")),
                    "distance_m": round(distance, 1),
                })

        return {
            "data": {
                "found": len(nearby) > 0,
                "premises": sorted(nearby, key=lambda x: x["distance_m"]),
            },
            "error": None,
        }
    except Exception as e:
        return {"data": None, "error": str(e)}
