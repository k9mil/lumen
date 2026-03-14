"""FoodHygieneAgent - checks food hygiene ratings from UK FSA.

API: https://ratings.food.gov.uk/
Free, no API key required.
"""

import httpx
from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class FoodHygieneAgent(BaseAgent):
    """Agent for checking food hygiene ratings.

    Input: {"business_name": "Pizza Express", "address": "142 Union St, Glasgow", "postcode": "G1 3QQ"}
    Output: {
        "found": True,
        "rating": 5,
        "rating_date": "2024-01-15",
        "hygiene_score": 0,
        "structural_score": 0,
        "confidence_in_management": 0,
        "local_authority": "Glasgow City"
    }

    Scoring:
    - Rating 0-2 (Poor): High risk
    - Rating 3 (Acceptable): Medium risk
    - Rating 4-5 (Good): Low risk
    """

    name = "food_hygiene"

    BASE_URL = "http://api.ratings.food.gov.uk"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that at least business name or postcode is provided."""
        if not data.get("business_name") and not data.get("postcode"):
            return False, "Need business_name or postcode"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Search for food hygiene rating."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        start_time = datetime.utcnow()

        business_name = input_data.get("business_name", "")
        address = input_data.get("address", "")
        postcode = input_data.get("postcode", "")

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                # Search by name and address
                params = {
                    "name": business_name,
                    "address": address,
                }

                if postcode:
                    params["postcode"] = postcode

                headers = {"x-api-version": "2", "Accept": "application/json"}

                response = await client.get(
                    f"{self.BASE_URL}/Establishments", params=params, headers=headers
                )

                if response.status_code != 200:
                    return Result.fail(f"FSA API returned {response.status_code}", agent=self.name)

                data = response.json()
                establishments = data.get("establishments", [])

                if not establishments:
                    return Result.ok(
                        {
                            "found": False,
                            "establishments": [],
                            "note": "No food hygiene records found",
                        },
                        agent=self.name,
                    )

                # Process results
                processed = []
                for est in establishments[:5]:  # Top 5 matches
                    processed.append(
                        {
                            "fhrs_id": est.get("FHRSID"),
                            "business_name": est.get("BusinessName"),
                            "business_type": est.get("BusinessType"),
                            "rating": self._parse_rating(est.get("RatingValue")),
                            "rating_date": est.get("RatingDate"),
                            "hygiene_score": est.get("scores", {}).get("Hygiene"),
                            "structural_score": est.get("scores", {}).get("Structural"),
                            "confidence_in_management": est.get("scores", {}).get(
                                "ConfidenceInManagement"
                            ),
                            "local_authority": est.get("LocalAuthorityName"),
                            "address": est.get("Address"),
                            "postcode": est.get("PostCode"),
                            "is_closed": est.get("BusinessType") == "Closed",
                            "distance": est.get("Distance"),
                        }
                    )

                # Find best match (lowest distance or exact name match)
                best_match = processed[0]

                output = {
                    "found": True,
                    "best_match": best_match,
                    "all_matches": processed,
                    "total_matches": len(establishments),
                    "risk_assessment": self._assess_risk(best_match),
                }

                end_time = datetime.utcnow()
                return Result.ok(output, agent=self.name, business_name=business_name).with_timing(
                    start_time, end_time
                )

        except httpx.TimeoutException:
            return Result.fail("FSA API timeout", agent=self.name)
        except Exception as e:
            return Result.fail(f"Food hygiene check failed: {str(e)}", agent=self.name)

    def _parse_rating(self, rating_value) -> int:
        """Parse rating value to integer."""
        if rating_value is None:
            return -1
        try:
            return int(rating_value)
        except (ValueError, TypeError):
            # Handle "AwaitingInspection", "Exempt", etc.
            return -1

    def _assess_risk(self, establishment: dict) -> dict:
        """Assess risk based on hygiene rating."""
        rating = establishment.get("rating", -1)

        if rating == -1:
            return {"level": "unknown", "score": 0, "description": "Rating not available"}

        if rating <= 2:
            return {
                "level": "high",
                "score": 30,
                "description": f"Poor hygiene rating ({rating}/5) - business stress indicator",
            }
        elif rating == 3:
            return {
                "level": "medium",
                "score": 10,
                "description": f"Acceptable hygiene rating ({rating}/5) - monitor",
            }
        else:
            return {"level": "low", "score": 0, "description": f"Good hygiene rating ({rating}/5)"}
