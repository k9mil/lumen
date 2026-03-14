"""ReviewSentimentAgent - analyzes Google Places reviews for risk signals.

Uses Gemini to analyze sentiment and detect closure/business decline signals.
Fetches last 10 reviews per location.

Cost: ~$0.005 per building (10 reviews × ~500 tokens each)
"""

from datetime import datetime
from typing import Any

from google import genai
from google.genai import types

from ..core.types import Result, AgentConfig, BaseAgent


SENTIMENT_PROMPT = """Analyze these Google reviews for a commercial property.

Reviews:
{reviews}

For each review:
1. Classify sentiment: positive, neutral, or negative
2. Extract any RISK SIGNALS indicating:
   - Business closure ("closed down", "shut", "went out of business")
   - Declining quality ("used to be good", "gone downhill")
   - Low foot traffic ("empty", "deserted", "always quiet")
   - Staff issues ("rude", "unprofessional", "high turnover")
   - Maintenance issues ("dirty", "run down", "needs repair")
   - Safety concerns ("unsafe", "sketchy", "dangerous")

Overall analysis:
- Calculate overall sentiment score (-1.0 to 1.0)
- Identify sentiment trend (improving/declining/stable)
- List all risk signals found
- Flag if multiple recent reviews mention closure

Return JSON:
{
    "overall_sentiment": "negative",
    "sentiment_score": -0.4,
    "trend": "declining",
    "risk_signals": ["low foot traffic", "maintenance issues"],
    "closure_mentions": 2,
    "confidence": 0.85,
    "summary": "Recent reviews indicate declining business with mentions of closure"
}"""


class ReviewSentimentAgent(BaseAgent):
    """Agent for analyzing review sentiment.

    Input: {"place_id": "ChIJ...", "reviews": [...]} or {"business_name": "...", "reviews": [...]}
    Output: {
        "overall_sentiment": "negative",
        "sentiment_score": -0.4,
        "risk_signals": ["low foot traffic"],
        "risk_score": 15
    }
    """

    name = "review_sentiment"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that reviews are provided."""
        if not data.get("reviews"):
            return False, "Missing reviews"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Analyze review sentiment with Gemini."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        if not self.config.google_api_key:
            return Result.fail("Missing Google API key", agent=self.name)

        start_time = datetime.utcnow()

        reviews = input_data.get("reviews", [])
        business_name = input_data.get("business_name", "Unknown")

        # Limit to last 10 reviews
        recent_reviews = reviews[:10]

        if not recent_reviews:
            return Result.ok(
                {
                    "found": False,
                    "overall_sentiment": "unknown",
                    "sentiment_score": 0,
                    "risk_signals": [],
                    "risk_score": 0,
                    "note": "No reviews to analyze",
                },
                agent=self.name,
            )

        try:
            # Format reviews for prompt
            formatted_reviews = self._format_reviews(recent_reviews)

            # Call Gemini for sentiment analysis
            client = genai.Client(api_key=self.config.google_api_key)

            prompt = SENTIMENT_PROMPT.format(reviews=formatted_reviews)

            response = client.models.generate_content(
                model="gemini-2.5-flash",  # Use flash for speed (2x faster)
                contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            )

            # Parse response
            text = response.text.strip()

            # Remove markdown code fences
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            import json

            analysis = json.loads(text)

            # Calculate risk score
            risk_score = self._calculate_risk_score(analysis)

            output = {
                "found": True,
                "business_name": business_name,
                "reviews_analyzed": len(recent_reviews),
                "overall_sentiment": analysis.get("overall_sentiment", "unknown"),
                "sentiment_score": analysis.get("sentiment_score", 0),
                "trend": analysis.get("trend", "stable"),
                "risk_signals": analysis.get("risk_signals", []),
                "closure_mentions": analysis.get("closure_mentions", 0),
                "confidence": analysis.get("confidence", 0.8),
                "summary": analysis.get("summary", ""),
                "risk_score": risk_score,
                "risk_level": "high"
                if risk_score >= 20
                else "medium"
                if risk_score >= 10
                else "low",
            }

            end_time = datetime.utcnow()
            return Result.ok(
                output, agent=self.name, reviews_count=len(recent_reviews)
            ).with_timing(start_time, end_time)

        except Exception as e:
            return Result.fail(f"Sentiment analysis failed: {str(e)}", agent=self.name)

    def _format_reviews(self, reviews: list) -> str:
        """Format reviews for prompt."""
        formatted = []
        for i, review in enumerate(reviews, 1):
            if isinstance(review, dict):
                text = review.get("text", "")
                rating = review.get("rating", "")
                time = review.get("time", "")
            else:
                text = str(review)
                rating = ""
                time = ""

            formatted.append(f'{i}. Rating: {rating}/5 | Date: {time}\n   "{text[:200]}"')

        return "\n\n".join(formatted)

    def _calculate_risk_score(self, analysis: dict) -> int:
        """Calculate risk score from sentiment analysis."""
        score = 0

        # Sentiment trend declining
        if analysis.get("trend") == "declining":
            score += 15

        # Low sentiment score
        sentiment_score = analysis.get("sentiment_score", 0)
        if sentiment_score < -0.5:
            score += 10
        elif sentiment_score < -0.3:
            score += 5

        # Closure mentions
        closure_mentions = analysis.get("closure_mentions", 0)
        if closure_mentions >= 2:
            score += 20
        elif closure_mentions >= 1:
            score += 10

        # Risk signals
        risk_signals = analysis.get("risk_signals", [])
        score += len(risk_signals) * 3

        return min(score, 35)  # Cap at 35 points
