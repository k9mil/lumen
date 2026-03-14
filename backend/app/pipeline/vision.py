import base64
import json

from google import genai


VISION_PROMPT = """Analyze these street view images of a commercial property. The images show the property from 4 directions (North, East, South, West).

Provide a structured assessment as JSON with the following fields:
- occupier_type: string describing the type of business/occupier visible (e.g., "retail shop", "restaurant", "office", "warehouse", "vacant")
- signage_text: array of strings containing any visible signage text
- confidence: float 0-1 indicating your confidence in the assessment
- flags: array of strings noting anything unusual or concerning (e.g., "vacant", "change_of_use", "multiple_occupiers", "signage_mismatch")

Respond ONLY with valid JSON, no other text."""


async def analyze_images(images: dict[str, bytes | None], model: str) -> dict:
    """Send street view images to Gemini for analysis."""
    try:
        client = genai.Client()

        parts = [VISION_PROMPT]
        for direction, image_bytes in images.items():
            if image_bytes is not None:
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64.b64encode(image_bytes).decode(),
                    }
                })
                parts.append(f"Direction: {direction}")

        response = client.models.generate_content(
            model=model,
            contents=[{"parts": parts}],
        )

        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]

        analysis = json.loads(text)
        return {"data": analysis, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}
