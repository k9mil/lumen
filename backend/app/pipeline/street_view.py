import asyncio

import httpx


async def fetch_street_view_images(
    lat: float, lng: float, api_key: str
) -> dict:
    """Fetch 4 orthogonal street view images (N/E/S/W)."""
    url = "https://maps.googleapis.com/maps/api/streetview"
    headings = [0, 90, 180, 270]
    labels = ["north", "east", "south", "west"]

    try:
        async with httpx.AsyncClient() as client:
            tasks = []
            for heading in headings:
                params = {
                    "size": "640x640",
                    "location": f"{lat},{lng}",
                    "heading": str(heading),
                    "pitch": "0",
                    "key": api_key,
                }
                tasks.append(client.get(url, params=params, timeout=15))

            responses = await asyncio.gather(*tasks, return_exceptions=True)

        images = {}
        for label, resp in zip(labels, responses):
            if isinstance(resp, Exception):
                images[label] = None
            elif resp.status_code == 200:
                images[label] = resp.content
            else:
                images[label] = None

        return {
            "data": {
                "images": images,
                "image_count": sum(1 for v in images.values() if v is not None),
            },
            "error": None,
        }
    except Exception as e:
        return {"data": None, "error": str(e)}
