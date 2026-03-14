"""VisionAgent - Multi-pass vision analysis with Gemini.

Performs 4 specialized analyses in PARALLEL:
1. General Assessment - occupier type, basic signage
2. Detailed Signage - ALL visible text including small print
3. Activity & Context - people count, vehicles, opening hours
4. Condition Assessment - building condition, maintenance, damage

Uses Gemini JSON mode for reliable structured output.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from google import genai
from google.genai import types

from ..core.types import Result, AgentConfig, BaseAgent

logger = logging.getLogger(__name__)


# Pass 1: General Assessment
PASS1_GENERAL = """Analyze these street view images of a commercial property (4 directions: North, East, South, West).

Provide a structured assessment:
- occupier_type: Type of business visible (e.g., "retail shop", "restaurant", "office", "vacant")
- signage_text: Main business signage visible (array of strings)
- confidence: 0-1 confidence score
- flags: Array of concerns ("vacant", "multiple_occupiers", "construction", etc.)"""

# Pass 2: Detailed Signage Reading
PASS2_SIGNAGE = """Carefully read ALL visible text in these street view images.

Include:
- Business names (main and secondary)
- Opening hours
- License numbers
- Phone numbers
- Small print on doors/windows
- Stickers and posters
- Any other text"""

# Pass 3: Activity & Context
PASS3_ACTIVITY = """Assess activity level and context in these street view images.

Estimate:
- people_visible: Approximate count of people (number)
- vehicles_parked: Approximate count (number)
- activity_level: "busy", "moderate", "quiet", or "deserted"
- time_indicators: Any clues about time of day (shadows, lighting)
- opening_status: "appears_open", "appears_closed", "unclear"
"""

# Pass 4: Condition Assessment
PASS4_CONDITION = """Evaluate building condition and maintenance from these street view images.

Assess:
- boarded_windows: true or false
- graffiti: "none", "minor", "moderate", or "severe"
- maintenance_level: "excellent", "good", "fair", or "poor"
- cleanliness: "clean", "acceptable", or "dirty"
- visible_damage: array of issues ["peeling paint", "broken glass", etc.]
- overall_condition_score: 1-10 (number)
- condition_flags: array of flags"""


class VisionAgent(BaseAgent):
    """Agent for multi-pass vision analysis via Gemini.

    Input: {"images": {"north": bytes, "east": bytes, ...}}
    Output: Merged analysis with confidence scores
    """

    name = "vision"

    PASSES = [
        ("general", PASS1_GENERAL),
        ("signage", PASS2_SIGNAGE),
        ("activity", PASS3_ACTIVITY),
        ("condition", PASS4_CONDITION),
    ]

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that images dict is provided."""
        if not data.get("images"):
            return False, "Missing required field: images"
        images = data["images"]
        if not isinstance(images, dict):
            return False, "images must be a dict"
        valid_images = [v for v in images.values() if v is not None]
        if len(valid_images) == 0:
            return False, "At least one image required"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Run 4-pass vision analysis IN PARALLEL and merge results."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        if not self.config.google_api_key:
            return Result.fail("Missing Google API key for Gemini", agent=self.name)

        start_time = datetime.utcnow()
        images = input_data["images"]

        try:
            client = genai.Client(api_key=self.config.google_api_key)

            # Run all 4 passes IN PARALLEL for speed
            logger.info("Running 4 vision passes in parallel...")

            async def run_pass_with_timeout(pass_name: str, prompt: str) -> dict | None:
                """Run a single pass with timeout."""
                try:
                    return await asyncio.wait_for(
                        self._run_pass(client, images, prompt, pass_name),
                        timeout=30.0,  # 30 second timeout per pass
                    )
                except asyncio.TimeoutError:
                    logger.warning(f"Vision pass {pass_name} timed out")
                    return None
                except Exception as e:
                    logger.warning(f"Vision pass {pass_name} failed: {e}")
                    return None

            # Create tasks for all 4 passes
            tasks = [run_pass_with_timeout(pass_name, prompt) for pass_name, prompt in self.PASSES]

            # Run all passes concurrently
            results_list = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            results = {}
            for i, (pass_name, _) in enumerate(self.PASSES):
                result = results_list[i]
                if isinstance(result, dict):
                    results[pass_name] = result
                    logger.debug(f"Pass {pass_name} succeeded")
                elif isinstance(result, Exception):
                    logger.warning(f"Pass {pass_name} raised exception: {result}")
                else:
                    logger.warning(f"Pass {pass_name} returned unexpected type: {type(result)}")

            if not results:
                return Result.fail("All vision passes failed", agent=self.name)

            logger.info(f"Vision completed: {len(results)}/4 passes succeeded")

            # Merge results
            merged = self._merge_results(results)

            end_time = datetime.utcnow()
            return Result.ok(
                merged,
                agent=self.name,
                model="gemini-2.5-flash",
                images_analyzed=len([v for v in images.values() if v is not None]),
                passes_completed=len(results),
            ).with_timing(start_time, end_time)

        except Exception as e:
            logger.exception("Vision analysis failed")
            return Result.fail(f"Vision analysis failed: {str(e)}", agent=self.name)

    async def _run_pass(
        self, client: genai.Client, images: dict, prompt: str, pass_name: str
    ) -> dict | None:
        """Run a single analysis pass with JSON mode for reliable output."""
        try:
            # Build content
            contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]

            # Add images
            for direction in ["north", "east", "south", "west"]:
                image_bytes = images.get(direction)
                if image_bytes:
                    contents.append(
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(
                                    inline_data=types.Blob(mime_type="image/jpeg", data=image_bytes)
                                )
                            ],
                        )
                    )
                    contents.append(
                        types.Content(
                            role="user", parts=[types.Part(text=f"Direction: {direction}")]
                        )
                    )

            # Call Gemini with JSON mode for reliable structured output
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )

            # Parse JSON response (should be valid JSON due to response_mime_type)
            text = response.text
            if not text:
                logger.warning(f"Pass {pass_name}: Empty response")
                return None

            parsed = json.loads(text)

            # Ensure result is a dict
            if isinstance(parsed, list):
                if len(parsed) > 0 and isinstance(parsed[0], dict):
                    return parsed[0]
                else:
                    logger.warning(f"Pass {pass_name}: Got list instead of dict")
                    return {"error": "Invalid response format", "raw": parsed}
            elif isinstance(parsed, dict):
                return parsed
            else:
                logger.warning(f"Pass {pass_name}: Unexpected response type: {type(parsed)}")
                return {"error": "Unexpected response type", "raw": str(parsed)[:100]}

        except json.JSONDecodeError as e:
            logger.warning(f"Pass {pass_name}: JSON decode error: {e}")
            return None
        except Exception as e:
            logger.warning(f"Pass {pass_name}: Exception: {e}")
            return None

    def _merge_results(self, results: dict) -> dict:
        """Merge results from all passes with confidence weighting."""

        # Start with general pass
        general = results.get("general", {})
        signage = results.get("signage", {})
        activity = results.get("activity", {})
        condition = results.get("condition", {})

        # Merge occupier type (from general)
        occupier_type = general.get("occupier_type", "unknown")

        # Merge signage (combine both passes, deduplicate)
        signage_general = set(general.get("signage_text", []))

        # Handle all_signage which might be a list or might not exist
        all_signage_raw = signage.get("all_signage", [])
        if isinstance(all_signage_raw, list):
            signage_detailed = set(all_signage_raw)
        else:
            signage_detailed = set()

        all_signage = list(signage_general | signage_detailed)

        # Merge flags (from all passes)
        all_flags = set(general.get("flags", []))
        condition_flags = condition.get("condition_flags", [])
        if isinstance(condition_flags, list):
            all_flags.update(condition_flags)

        # Add condition-based flags
        if condition.get("boarded_windows"):
            all_flags.add("boarded_windows")
        if condition.get("graffiti") in ["moderate", "severe"]:
            all_flags.add("graffiti_present")
        if condition.get("maintenance_level") == "poor":
            all_flags.add("poor_maintenance")

        # Calculate weighted confidence
        confidences = [
            general.get("confidence", 0.8),
            signage.get("confidence", 0.8),
            activity.get("confidence", 0.8),
            condition.get("confidence", 0.8),
        ]
        avg_confidence = sum(confidences) / len(confidences)

        # Adjust confidence based on agreement
        if len([c for c in confidences if c > 0.8]) >= 3:
            final_confidence = min(avg_confidence * 1.1, 1.0)
        else:
            final_confidence = avg_confidence

        return {
            "occupier_type": occupier_type,
            "signage_text": all_signage,
            "confidence": round(final_confidence, 2),
            "flags": list(all_flags),
            # Additional details
            "activity_level": activity.get("activity_level", "unknown"),
            "people_visible": activity.get("people_visible"),
            "opening_status": activity.get("opening_status", "unclear"),
            "condition_score": condition.get("overall_condition_score"),
            "maintenance_level": condition.get("maintenance_level", "unknown"),
            "graffiti": condition.get("graffiti", "none"),
            "boarded_windows": condition.get("boarded_windows", False),
            # Raw pass results for debugging
            "pass_results": {
                "general": general,
                "signage": signage,
                "activity": activity,
                "condition": condition,
            },
        }
