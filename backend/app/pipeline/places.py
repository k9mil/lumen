import httpx


async def search_place(place_id: str, api_key: str) -> dict:
    """Get place details from Google Places API."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,types,rating,user_ratings_total,reviews",
        "key": api_key,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") != "OK":
            return {"data": None, "error": f"Places API failed: {data.get('status')}"}

        result = data["result"]
        reviews = result.get("reviews", [])
        review_snippets = [r.get("text", "")[:200] for r in reviews[:5]]

        return {
            "data": {
                "trading_name": result.get("name", ""),
                "types": result.get("types", []),
                "rating": result.get("rating"),
                "review_count": result.get("user_ratings_total", 0),
                "review_snippets": review_snippets,
            },
            "error": None,
        }
    except Exception as e:
        return {"data": None, "error": str(e)}
