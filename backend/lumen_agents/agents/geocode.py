"""GeocodeAgent - canonicalizes addresses via Google Geocoding API."""

import httpx
from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class GeocodeAgent(BaseAgent):
    """Agent for geocoding addresses.

    Input: {"address": "142 Union Street, Glasgow G1 3QQ"}
    Output: {"place_id": "...", "lat": 55.8592, "lng": -4.2584, ...}
    """

    name = "geocode"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that address is provided."""
        if not data.get("address"):
            return False, "Missing required field: address"
        if not isinstance(data["address"], str):
            return False, "address must be a string"
        if len(data["address"].strip()) < 5:
            return False, "address too short"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Geocode an address."""
        # Validate input
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        # Check API key
        key_check = self._requires_key("google_api_key", self.config.google_api_key)
        if not key_check.success:
            return Result.fail(key_check.error or "Missing API key", agent=self.name)

        start_time = datetime.utcnow()

        address = input_data["address"].strip()

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(
                    "https://maps.googleapis.com/maps/api/geocode/json",
                    params={"address": address, "key": self.config.google_api_key},
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException:
            return Result.fail("Geocoding API timeout", agent=self.name)
        except httpx.HTTPStatusError as e:
            return Result.fail(f"HTTP {e.response.status_code}: {e.response.text}", agent=self.name)
        except Exception as e:
            return Result.fail(f"Request failed: {str(e)}", agent=self.name)

        # Check API response status
        if data.get("status") != "OK":
            return Result.fail(
                f"Geocoding failed: {data.get('status')}",
                agent=self.name,
                api_status=data.get("status"),
            )

        if not data.get("results"):
            return Result.fail("No results found for address", agent=self.name)

        # Extract first result
        result = data["results"][0]
        location = result["geometry"]["location"]
        viewport = result["geometry"].get("viewport", {})

        output = {
            "place_id": result["place_id"],
            "lat": location["lat"],
            "lng": location["lng"],
            "formatted_address": result["formatted_address"],
            "bbox": viewport,
            "address_components": result.get("address_components", []),
            "partial_match": result.get("partial_match", False),
        }

        end_time = datetime.utcnow()
        return Result.ok(output, agent=self.name, input_address=address).with_timing(
            start_time, end_time
        )
