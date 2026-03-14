"""StreetViewAgent - fetches 4 orthogonal street view images."""

import asyncio
import httpx
from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class StreetViewAgent(BaseAgent):
    """Agent for fetching street view images.

    Input: {"lat": 55.8592, "lng": -4.2584}
    Output: {"images": {"north": bytes, "east": bytes, ...}, "image_count": 4}
    """

    name = "street_view"

    DIRECTIONS = [("north", 0), ("east", 90), ("south", 180), ("west", 270)]

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate lat/lng coordinates."""
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

        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Fetch 4 street view images."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        key_check = self._requires_key("google_api_key", self.config.google_api_key)
        if not key_check.success:
            return Result.fail(key_check.error or "Missing API key", agent=self.name)

        start_time = datetime.utcnow()

        lat = float(input_data["lat"])
        lng = float(input_data["lng"])

        # Fetch all 4 images concurrently
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            tasks = []
            for direction, heading in self.DIRECTIONS:
                task = self._fetch_image(client, lat, lng, heading)
                tasks.append((direction, task))

            results = []
            for direction, task in tasks:
                try:
                    image_data = await task
                    results.append((direction, image_data))
                except Exception as e:
                    results.append((direction, None))

        images = {direction: data for direction, data in results}
        image_count = sum(1 for v in images.values() if v is not None)

        output = {
            "images": images,
            "image_count": image_count,
            "coordinates": {"lat": lat, "lng": lng},
        }

        end_time = datetime.utcnow()
        return Result.ok(
            output, agent=self.name, lat=lat, lng=lng, images_fetched=image_count
        ).with_timing(start_time, end_time)

    async def _fetch_image(
        self, client: httpx.AsyncClient, lat: float, lng: float, heading: int
    ) -> bytes | None:
        """Fetch single street view image."""
        try:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/streetview",
                params={
                    "size": "640x640",
                    "location": f"{lat},{lng}",
                    "heading": str(heading),
                    "pitch": "0",
                    "key": self.config.google_api_key,
                },
            )
            response.raise_for_status()
            return response.content
        except Exception:
            return None
