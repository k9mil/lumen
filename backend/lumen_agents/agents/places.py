"""PlacesAgent - fetches business details from Google Places API."""

import httpx
from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class PlacesAgent(BaseAgent):
    """Agent for Google Places details.

    Input: {"place_id": "ChIJ..."}
    Output: {"trading_name": "...", "types": ["restaurant", "..."], ...}
    """

    name = "places"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that place_id is provided."""
        if not data.get("place_id"):
            return False, "Missing required field: place_id"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Fetch place details."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        key_check = self._requires_key("google_api_key", self.config.google_api_key)
        if not key_check.success:
            return Result.fail(key_check.error or "Missing API key", agent=self.name)

        start_time = datetime.utcnow()

        place_id = input_data["place_id"]

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={
                        "place_id": place_id,
                        "fields": "name,types,rating,user_ratings_total,reviews,formatted_address",
                        "key": self.config.google_api_key,
                    },
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException:
            return Result.fail("Places API timeout", agent=self.name)
        except httpx.HTTPStatusError as e:
            return Result.fail(f"HTTP {e.response.status_code}", agent=self.name)
        except Exception as e:
            return Result.fail(f"Request failed: {str(e)}", agent=self.name)

        if data.get("status") != "OK":
            return Result.fail(
                f"Places API failed: {data.get('status')}",
                agent=self.name,
                api_status=data.get("status"),
            )

        result = data.get("result", {})
        reviews = result.get("reviews", [])

        # Extract review snippets (first 200 chars)
        review_snippets = []
        for review in reviews[:5]:
            text = review.get("text", "")[:200]
            if len(review.get("text", "")) > 200:
                text += "..."
            review_snippets.append(
                {"text": text, "rating": review.get("rating"), "time": review.get("time")}
            )

        output = {
            "trading_name": result.get("name", ""),
            "formatted_address": result.get("formatted_address", ""),
            "types": result.get("types", []),
            "rating": result.get("rating"),
            "review_count": result.get("user_ratings_total", 0),
            "review_snippets": review_snippets,
        }

        end_time = datetime.utcnow()
        return Result.ok(output, agent=self.name, place_id=place_id).with_timing(
            start_time, end_time
        )
