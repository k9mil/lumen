"""ScoringAgent - calculates risk score from evidence signals."""

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
]


class ScoringAgent(BaseAgent):
    """Agent for calculating risk scores.

    Input: {
        "vision_data": {...},
        "companies_house_data": {...},
        "places_data": {...},
        "licensing_data": {...},
        "property_class": "Retail",
        "previous_vision": {...}  # optional, for change detection
    }
    Output: {
        "score": 65,
        "tier": "high",
        "evidence_items": [...]
    }
    """

    name = "scoring"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that at least one data source is present."""
        sources = ["vision_data", "companies_house_data", "places_data", "licensing_data"]
        if not any(data.get(s) for s in sources):
            return False, "At least one data source required"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Calculate risk score."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        start_time = datetime.utcnow()

        evidence_items = []

        # Extract data
        vision = input_data.get("vision_data") or {}
        companies = input_data.get("companies_house_data") or {}
        places = input_data.get("places_data") or {}
        licensing = input_data.get("licensing_data") or {}
        property_class = input_data.get("property_class", "")
        previous_vision = input_data.get("previous_vision")

        # 1. CV Classification changes
        if vision and previous_vision:
            curr_type = vision.get("occupier_type", "").lower()
            prev_type = previous_vision.get("occupier_type", "").lower()

            if curr_type and prev_type and curr_type != prev_type:
                evidence_items.append(
                    {
                        "signal_type": "cv_classification_change",
                        "description": f"Occupier changed from '{prev_type}' to '{curr_type}'",
                        "weight": WEIGHTS["cv_classification_change"],
                        "details": {"from": prev_type, "to": curr_type},
                    }
                )

        # 2. CV Classification mismatch with property class
        if vision and property_class:
            occupier = vision.get("occupier_type", "").lower()
            prop_lower = property_class.lower()

            if occupier and not self._types_compatible(prop_lower, occupier):
                evidence_items.append(
                    {
                        "signal_type": "cv_classification_mismatch",
                        "description": f"CV shows '{occupier}' but property class is '{property_class}'",
                        "weight": WEIGHTS["cv_classification_mismatch"],
                        "details": {
                            "occupier_type": occupier,
                            "property_class": property_class,
                            "flags": vision.get("flags", []),
                        },
                    }
                )

        # 3. SIC code mismatch
        if companies and property_class:
            company_list = companies.get("companies", [])
            for company in company_list:
                sic_codes = company.get("sic_codes", [])
                if sic_codes and not self._sic_matches_property(sic_codes, property_class):
                    evidence_items.append(
                        {
                            "signal_type": "sic_mismatch",
                            "description": f"SIC codes {sic_codes} don't match property class '{property_class}'",
                            "weight": WEIGHTS["sic_mismatch"],
                            "details": {
                                "company_name": company.get("company_name"),
                                "sic_codes": sic_codes,
                                "property_class": property_class,
                            },
                        }
                    )
                    break  # Only one SIC mismatch per building

        # 4. Licensing nearby
        if licensing and licensing.get("found"):
            premises = licensing.get("premises", [])
            evidence_items.append(
                {
                    "signal_type": "licensing_nearby",
                    "description": f"{len(premises)} licensed premise(s) within {licensing.get('search_radius_m', 100)}m",
                    "weight": WEIGHTS["licensing_nearby"],
                    "details": {"premises": premises[:5]},  # Limit to first 5
                }
            )

        # 5. Keyword hits
        keywords_found = self._find_keywords(vision, places)
        if keywords_found:
            evidence_items.append(
                {
                    "signal_type": "keyword_hit",
                    "description": f"Risk keywords found: {', '.join(sorted(keywords_found))}",
                    "weight": WEIGHTS["keyword_hit"],
                    "details": {"keywords": sorted(keywords_found)},
                }
            )

        # Calculate total score
        total_score = sum(item["weight"] for item in evidence_items)
        score = min(total_score, 100)
        tier = self._score_to_tier(score)

        output = {
            "score": score,
            "tier": tier,
            "evidence_items": evidence_items,
            "evidence_count": len(evidence_items),
        }

        end_time = datetime.utcnow()
        return Result.ok(
            output,
            agent=self.name,
            max_weight=max((i["weight"] for i in evidence_items), default=0),
        ).with_timing(start_time, end_time)

    def _types_compatible(self, property_class: str, occupier_type: str) -> bool:
        """Check if occupier type matches property class."""
        prop_lower = property_class.lower()
        occ_lower = occupier_type.lower()

        # Direct substring match
        if prop_lower in occ_lower or occ_lower in prop_lower:
            return True

        # Compatibility mapping
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

        return True  # Default to compatible

    def _sic_matches_property(self, sic_codes: list[str], property_class: str) -> bool:
        """Check if SIC codes match property class."""
        prop_lower = property_class.lower()

        # SIC prefixes
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

        return True  # Default to compatible

    def _find_keywords(self, vision: dict, places: dict) -> set[str]:
        """Scan for risk keywords in vision and places data."""
        found = set()
        texts = []

        # From vision
        if vision:
            texts.extend(vision.get("signage_text", []))

        # From places
        if places:
            texts.append(places.get("trading_name", ""))
            for review in places.get("review_snippets", []):
                # Handle both string and dict formats
                if isinstance(review, dict):
                    texts.append(review.get("text", ""))
                else:
                    texts.append(str(review))

        # Scan
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
