import httpx


async def geocode(address: str, api_key: str) -> dict:
    """Geocode an address via Google Geocoding API."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": api_key}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

        if data["status"] != "OK" or not data["results"]:
            return {"data": None, "error": f"Geocoding failed: {data['status']}"}

        result = data["results"][0]
        location = result["geometry"]["location"]
        viewport = result["geometry"].get("viewport", {})

        return {
            "data": {
                "place_id": result["place_id"],
                "lat": location["lat"],
                "lng": location["lng"],
                "formatted_address": result["formatted_address"],
                "bbox": viewport,
            },
            "error": None,
        }
    except Exception as e:
        return {"data": None, "error": str(e)}
