"""ScoringAgent - calculates risk score from evidence signals with confidence weighting."""

from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


# Signal weights (0-100 scale)
WEIGHTS = {
    "cv_classification_change": 40,
    "cv_classification_mismatch": 40,
    "sic_mismatch": 25,
    "licensing_nearby": 20,
    "keyword_hit": 15,
    "food_hygiene_poor": 30,
    "food_hygiene_acceptable": 10,
    "review_negative_trend": 15,
    "review_closure_mentions": 20,
    "crime_commercial_high": 20,
    "crime_commercial_medium": 10,
}

# Source reliability scores (0-1)
SOURCE_RELIABILITY = {
    "vision": 0.90,  # Gemini - good but can hallucinate
    "companies_house": 0.95,  # Authoritative government data
    "food_hygiene": 0.95,  # Official inspections
    "reviews": 0.70,  # Subjective, can be biased
    "crime": 0.90,  # Official police data
    "licensing": 0.95,  # Official license data
}

# Risk keywords to scan for
RISK_KEYWORDS = [
    "vape",
    "shisha",
    "tobacco",
    "hookah",
    "late-night",
    "kitchen",
    "takeaway",
    "off-licence",
    "betting",
    "gambling",
    "pawnbroker",
    "money transfer",
    "car wash",
    "hand car wash",
    "tanning",
    # Additional keywords
    "payday loans",
    "cash converters",
    "quick cash",
    "cheque centre",
    "amusement arcade",
    "bingo",
    "casino",
    "adult shop",
    "tattoo",
    "piercing",
    "nail bar",
    "beauty salon",
]


class ScoringAgent(BaseAgent):
    """Agent for calculating risk scores with confidence weighting.

    Input: {
        "vision_data": {...},
        "companies_house_data": {...},
        "food_hygiene_data": {...},
        "review_data": {...},
        "crime_data": {...},
        "licensing_data": {...},
        "places_data": {...},
        "property_class": "Retail",
        "previous_vision": {...}
    }
    Output: {
        "score": 65,
        "tier": "high",
        "evidence_items": [...],
        "confidence": 0.87
    }
    """

    name = "scoring"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that at least one data source is present."""
        sources = [
            "vision_data",
            "companies_house_data",
            "food_hygiene_data",
            "review_data",
            "crime_data",
            "licensing_data",
            "places_data",
        ]
        if not any(data.get(s) for s in sources):
            return False, "At least one data source required"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Calculate risk score with confidence weighting."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        start_time = datetime.utcnow()

        evidence_items = []

        # Extract all data sources
        vision = input_data.get("vision_data") or {}
        companies = input_data.get("companies_house_data") or {}
        food_hygiene = input_data.get("food_hygiene_data") or {}
        review = input_data.get("review_data") or {}
        crime = input_data.get("crime_data") or {}
        licensing = input_data.get("licensing_data") or {}
        places = input_data.get("places_data") or {}
        property_class = input_data.get("property_class", "")
        previous_vision = input_data.get("previous_vision")

        # 1. CV Classification changes
        if vision and previous_vision:
            item = self._check_cv_change(vision, previous_vision)
            if item:
                evidence_items.append(item)

        # 2. CV Classification mismatch
        if vision and property_class:
            item = self._check_cv_mismatch(vision, property_class)
            if item:
                evidence_items.append(item)

        # 3. SIC code mismatch
        if companies and property_class:
            item = self._check_sic_mismatch(companies, property_class)
            if item:
                evidence_items.append(item)

        # 4. Food hygiene ratings
        if food_hygiene:
            item = self._check_food_hygiene(food_hygiene)
            if item:
                evidence_items.append(item)

        # 6. Review sentiment
        if review:
            item = self._check_reviews(review)
            if item:
                evidence_items.append(item)

        # 7. Crime statistics
        if crime:
            item = self._check_crime(crime)
            if item:
                evidence_items.append(item)

        # 8. Licensing nearby
        if licensing:
            item = self._check_licensing(licensing)
            if item:
                evidence_items.append(item)

        # 9. Keyword hits
        keywords_found = self._find_keywords(vision, places)
        if keywords_found:
            evidence_items.append(
                {
                    "signal_type": "keyword_hit",
                    "description": f"Risk keywords found: {', '.join(sorted(keywords_found))}",
                    "weight": WEIGHTS["keyword_hit"],
                    "confidence": 0.75,  # Lower confidence for keyword matching
                    "confidence_factors": {
                        "source_reliability": 0.75,
                        "data_freshness": 1.0,
                        "corroboration_count": 0,
                    },
                    "details": {"keywords": sorted(keywords_found)},
                    "source": "keyword_matching",
                }
            )

        # Calculate weighted score
        total_score, confidence_score = self._calculate_weighted_score(evidence_items)
        score = min(total_score, 100)
        tier = self._score_to_tier(score)

        output = {
            "score": score,
            "tier": tier,
            "evidence_items": evidence_items,
            "evidence_count": len(evidence_items),
            "confidence": round(confidence_score, 2),
        }

        end_time = datetime.utcnow()
        return Result.ok(
            output,
            agent=self.name,
            max_weight=max((i["weight"] for i in evidence_items), default=0),
        ).with_timing(start_time, end_time)

    def _check_cv_change(self, vision: dict, previous_vision: dict) -> dict | None:
        """Check for CV classification changes."""
        curr_type = vision.get("occupier_type", "").lower()
        prev_type = previous_vision.get("occupier_type", "").lower()

        if curr_type and prev_type and curr_type != prev_type:
            confidence = vision.get("confidence", 0.8)
            return {
                "signal_type": "cv_classification_change",
                "description": f"Occupier changed from '{prev_type}' to '{curr_type}'",
                "weight": WEIGHTS["cv_classification_change"],
                "confidence": confidence,
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["vision"],
                    "vision_confidence": confidence,
                    "data_freshness": 1.0,
                    "corroboration_count": 0,
                },
                "details": {"from": prev_type, "to": curr_type},
                "source": "vision",
            }
        return None

    def _check_cv_mismatch(self, vision: dict, property_class: str) -> dict | None:
        """Check for CV classification mismatch with property class."""
        occupier = vision.get("occupier_type", "").lower()
        prop_lower = property_class.lower()

        if occupier and not self._types_compatible(prop_lower, occupier):
            confidence = vision.get("confidence", 0.8)
            return {
                "signal_type": "cv_classification_mismatch",
                "description": f"CV shows '{occupier}' but property class is '{property_class}'",
                "weight": WEIGHTS["cv_classification_mismatch"],
                "confidence": confidence,
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["vision"],
                    "vision_confidence": confidence,
                    "data_freshness": 1.0,
                    "corroboration_count": 0,
                },
                "details": {
                    "occupier_type": occupier,
                    "property_class": property_class,
                    "flags": vision.get("flags", []),
                },
                "source": "vision",
            }
        return None

    def _check_sic_mismatch(self, companies: dict, property_class: str) -> dict | None:
        """Check for SIC code mismatch."""
        company_list = companies.get("companies", [])
        for company in company_list:
            sic_codes = company.get("sic_codes", [])
            if sic_codes and not self._sic_matches_property(sic_codes, property_class):
                return {
                    "signal_type": "sic_mismatch",
                    "description": f"SIC codes {sic_codes} don't match property class '{property_class}'",
                    "weight": WEIGHTS["sic_mismatch"],
                    "confidence": 0.90,
                    "confidence_factors": {
                        "source_reliability": SOURCE_RELIABILITY["companies_house"],
                        "data_freshness": 1.0,
                        "corroboration_count": 0,
                    },
                    "details": {
                        "company_name": company.get("company_name"),
                        "sic_codes": sic_codes,
                        "property_class": property_class,
                    },
                    "source": "companies_house",
                }
        return None

    def _check_food_hygiene(self, food_hygiene: dict) -> dict | None:
        """Check food hygiene ratings."""
        if not food_hygiene.get("found"):
            return None

        best = food_hygiene.get("best_match", {})
        rating = best.get("rating", -1)
        risk = food_hygiene.get("risk_assessment", {})

        if rating <= 2 and rating >= 0:
            return {
                "signal_type": "food_hygiene_poor",
                "description": f"Poor food hygiene rating ({rating}/5) - {risk.get('description', '')}",
                "weight": WEIGHTS["food_hygiene_poor"],
                "confidence": 0.95,
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["food_hygiene"],
                    "data_freshness": 0.95,
                    "corroboration_count": 0,
                },
                "details": best,
                "source": "food_hygiene",
            }
        elif rating == 3:
            return {
                "signal_type": "food_hygiene_acceptable",
                "description": f"Acceptable food hygiene rating ({rating}/5)",
                "weight": WEIGHTS["food_hygiene_acceptable"],
                "confidence": 0.95,
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["food_hygiene"],
                    "data_freshness": 0.95,
                    "corroboration_count": 0,
                },
                "details": best,
                "source": "food_hygiene",
            }
        return None

    def _check_reviews(self, review: dict) -> dict | None:
        """Check review sentiment."""
        if not review.get("found"):
            return None

        closure_mentions = review.get("closure_mentions", 0)
        trend = review.get("trend", "stable")

        if closure_mentions >= 2:
            return {
                "signal_type": "review_closure_mentions",
                "description": f"Multiple reviews ({closure_mentions}) mention closure concerns",
                "weight": WEIGHTS["review_closure_mentions"],
                "confidence": review.get("confidence", 0.7),
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["reviews"],
                    "data_freshness": 0.9,
                    "corroboration_count": closure_mentions,
                },
                "details": review,
                "source": "reviews",
            }
        elif trend == "declining":
            return {
                "signal_type": "review_negative_trend",
                "description": "Review sentiment declining",
                "weight": WEIGHTS["review_negative_trend"],
                "confidence": review.get("confidence", 0.7),
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["reviews"],
                    "data_freshness": 0.9,
                    "corroboration_count": 0,
                },
                "details": review,
                "source": "reviews",
            }
        return None

    def _check_crime(self, crime: dict) -> dict | None:
        """Check crime statistics."""
        if not crime.get("found"):
            return None

        risk = crime.get("risk_assessment", {})
        score = risk.get("score", 0)

        if score >= 20:
            return {
                "signal_type": "crime_commercial_high",
                "description": f"High commercial crime risk: {'; '.join(risk.get('reasons', []))}",
                "weight": WEIGHTS["crime_commercial_high"],
                "confidence": 0.90,
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["crime"],
                    "data_freshness": 0.85,
                    "corroboration_count": 0,
                },
                "details": crime,
                "source": "crime",
            }
        elif score >= 10:
            return {
                "signal_type": "crime_commercial_medium",
                "description": f"Medium commercial crime risk: {'; '.join(risk.get('reasons', []))}",
                "weight": WEIGHTS["crime_commercial_medium"],
                "confidence": 0.90,
                "confidence_factors": {
                    "source_reliability": SOURCE_RELIABILITY["crime"],
                    "data_freshness": 0.85,
                    "corroboration_count": 0,
                },
                "details": crime,
                "source": "crime",
            }
        return None

    def _check_licensing(self, licensing: dict) -> dict | None:
        """Check for nearby licensed premises."""
        if not licensing.get("found"):
            return None

        premises = licensing.get("premises", [])
        return {
            "signal_type": "licensing_nearby",
            "description": f"{len(premises)} licensed premise(s) within {licensing.get('search_radius_m', 100)}m",
            "weight": WEIGHTS["licensing_nearby"],
            "confidence": 0.95,
            "confidence_factors": {
                "source_reliability": SOURCE_RELIABILITY["licensing"],
                "data_freshness": 0.9,
                "corroboration_count": 0,
            },
            "details": {"premises": premises[:5]},
            "source": "licensing",
        }

    def _calculate_weighted_score(self, evidence_items: list) -> tuple[int, float]:
        """Calculate weighted score and overall confidence."""
        total_score = 0
        confidences = []

        for item in evidence_items:
            weight = item.get("weight", 0)
            confidence = item.get("confidence", 0.8)

            # Apply confidence weighting
            adjusted_weight = weight * confidence
            total_score += adjusted_weight
            confidences.append(confidence)

        # Calculate overall confidence
        if confidences:
            avg_confidence = sum(confidences) / len(confidences)
            # Boost confidence if multiple high-confidence signals
            high_conf_count = sum(1 for c in confidences if c >= 0.85)
            if high_conf_count >= 2:
                overall_confidence = min(avg_confidence * 1.1, 1.0)
            else:
                overall_confidence = avg_confidence
        else:
            overall_confidence = 0.0

        return int(total_score), overall_confidence

    def _types_compatible(self, property_class: str, occupier_type: str) -> bool:
        """Check if occupier type matches property class."""
        prop_lower = property_class.lower()
        occ_lower = occupier_type.lower()

        if prop_lower in occ_lower or occ_lower in prop_lower:
            return True

        compatible = {
            "office": ["office", "professional", "consultancy", "studio", "agency"],
            "retail": ["shop", "store", "retail", "boutique", "salon"],
            "restaurant": ["restaurant", "cafe", "food", "dining", "bistro", "coffee"],
            "warehouse": ["warehouse", "storage", "industrial", "distribution", "logistics"],
            "residential": ["residential", "flat", "apartment", "house"],
        }

        for cls, terms in compatible.items():
            if cls in prop_lower:
                return any(t in occ_lower for t in terms)

        return True

    def _sic_matches_property(self, sic_codes: list[str], property_class: str) -> bool:
        """Check if SIC codes match property class."""
        prop_lower = property_class.lower()

        retail_sics = any(s.startswith("47") for s in sic_codes)
        food_sics = any(s.startswith("56") for s in sic_codes)
        office_sics = any(
            s.startswith(("62", "63", "64", "65", "66", "69", "70", "71", "72", "73"))
            for s in sic_codes
        )

        if "retail" in prop_lower and retail_sics:
            return True
        if "restaurant" in prop_lower and food_sics:
            return True
        if "food" in prop_lower and food_sics:
            return True
        if "office" in prop_lower and office_sics:
            return True

        return True

    def _find_keywords(self, vision: dict, places: dict) -> set[str]:
        """Scan for risk keywords."""
        found = set()
        texts = []

        if vision:
            texts.extend(vision.get("signage_text", []))

        if places:
            texts.append(places.get("trading_name", ""))
            for review in places.get("review_snippets", []):
                if isinstance(review, dict):
                    texts.append(review.get("text", ""))
                else:
                    texts.append(str(review))

        combined = " ".join(texts).lower()
        for keyword in RISK_KEYWORDS:
            if keyword in combined:
                found.add(keyword)

        return found

    def _score_to_tier(self, score: int) -> str:
        """Convert score to risk tier."""
        if score <= 30:
            return "low"
        elif score <= 65:
            return "medium"
        elif score <= 85:
            return "high"
        else:
            return "critical"
