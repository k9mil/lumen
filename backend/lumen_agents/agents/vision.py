"""VisionAgent - analyzes street view images with Gemini."""

import base64
import json
from datetime import datetime
from typing import Any

from google import genai
from google.genai import types

from ..core.types import Result, AgentConfig, BaseAgent


VISION_PROMPT = """Analyze these street view images of a commercial property. The images show the property from 4 directions (North, East, South, West).

Provide a structured assessment as JSON with the following fields:
- occupier_type: string describing the type of business/occupier visible (e.g., "retail shop", "restaurant", "office", "warehouse", "vacant", "unknown")
- signage_text: array of strings containing any visible signage text (e.g., ["Costa Coffee", "Open 24 Hours"])
- confidence: float 0-1 indicating your confidence in the assessment (1.0 = very confident, 0.0 = uncertain)
- flags: array of strings noting anything unusual or concerning. Valid flags: "vacant", "change_of_use", "multiple_occupiers", "signage_mismatch", "closed", "construction", "vape_shop", "tobacco_shop"

Respond ONLY with valid JSON, no markdown formatting, no additional text.

Example response:
{
  "occupier_type": "coffee shop",
  "signage_text": ["Costa Coffee", "Free WiFi"],
  "confidence": 0.95,
  "flags": []
}"""


class VisionAgent(BaseAgent):
    """Agent for vision analysis via Gemini.

    Input: {"images": {"north": bytes, "east": bytes, ...}} (from StreetViewAgent)
    Output: {"occupier_type": "...", "signage_text": [...], "confidence": 0.95, "flags": [...]}
    """

    name = "vision"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that images dict is provided."""
        if not data.get("images"):
            return False, "Missing required field: images"
        images = data["images"]
        if not isinstance(images, dict):
            return False, "images must be a dict"
        # At least one valid image
        valid_images = [v for v in images.values() if v is not None]
        if len(valid_images) == 0:
            return False, "At least one image required"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Analyze images with Gemini."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        # Gemini uses GOOGLE_API_KEY from environment by default
        # but we can verify it's set
        if not self.config.google_api_key:
            return Result.fail("Missing Google API key for Gemini", agent=self.name)

        start_time = datetime.utcnow()

        images = input_data["images"]

        try:
            # Initialize Gemini client with explicit API key
            client = genai.Client(api_key=self.config.google_api_key)

            # Build content using proper types
            contents = []

            # Add prompt
            contents.append(types.Content(role="user", parts=[types.Part(text=VISION_PROMPT)]))

            # Add images with direction labels
            for direction in ["north", "east", "south", "west"]:
                image_bytes = images.get(direction)
                if image_bytes:
                    # Add image
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
                    # Add direction label
                    contents.append(
                        types.Content(
                            role="user", parts=[types.Part(text=f"Direction: {direction}")]
                        )
                    )

            # Call Gemini
            response = client.models.generate_content(
                model="gemini-3.1-pro-preview", contents=contents
            )

            # Parse response
            text = response.text.strip()

            # Remove markdown code fences if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            analysis = json.loads(text)

            # Validate expected fields
            output = {
                "occupier_type": analysis.get("occupier_type", "unknown"),
                "signage_text": analysis.get("signage_text", []),
                "confidence": float(analysis.get("confidence", 0.0)),
                "flags": analysis.get("flags", []),
            }

            end_time = datetime.utcnow()
            return Result.ok(
                output,
                agent=self.name,
                model="gemini-3.1-pro-preview",
                images_analyzed=len([v for v in images.values() if v is not None]),
            ).with_timing(start_time, end_time)

        except json.JSONDecodeError as e:
            return Result.fail(
                f"Failed to parse Gemini response as JSON: {str(e)}",
                agent=self.name,
                raw_response=getattr(response, "text", "N/A")[:500],
            )
        except Exception as e:
            return Result.fail(f"Vision analysis failed: {str(e)}", agent=self.name)
