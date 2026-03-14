KEYWORD_LIST = [
    "vape", "shisha", "tobacco", "hookah", "late-night", "kitchen",
    "takeaway", "off-licence", "betting", "gambling", "pawnbroker",
    "money transfer", "car wash", "hand car wash", "tanning",
]

WEIGHT_CV_CLASSIFICATION = 40
WEIGHT_SIC_MISMATCH = 25
WEIGHT_LICENSING = 20
WEIGHT_KEYWORD_HIT = 15


def calculate_risk_score(evidence_items: list[dict]) -> tuple[int, str]:
    """Calculate total risk score from evidence items and return (score, tier)."""
    total = sum(item["weight"] for item in evidence_items)
    score = min(int(total), 100)
    tier = score_to_tier(score)
    return score, tier


def score_to_tier(score: int) -> str:
    if score <= 30:
        return "low"
    elif score <= 65:
        return "medium"
    elif score <= 85:
        return "high"
    else:
        return "critical"


def create_evidence_items(
    *,
    vision_data: dict | None,
    company_data: dict | None,
    places_data: dict | None,
    licensing_data: dict | None,
    property_class: str,
    previous_vision: dict | None = None,
) -> list[dict]:
    """Generate evidence items from pipeline outputs."""
    items = []

    # CV classification change or mismatch
    if vision_data:
        occupier_type = vision_data.get("occupier_type", "").lower()
        flags = vision_data.get("flags", [])

        # Check for change vs previous
        if previous_vision:
            prev_type = previous_vision.get("occupier_type", "").lower()
            if occupier_type and prev_type and occupier_type != prev_type:
                items.append({
                    "signal_type": "cv_classification",
                    "description": f"Occupier type changed from '{prev_type}' to '{occupier_type}'",
                    "weight": WEIGHT_CV_CLASSIFICATION,
                    "raw_data": {
                        "previous": prev_type,
                        "current": occupier_type,
                    },
                })

        # Check for mismatch with property class
        if property_class and occupier_type:
            prop_lower = property_class.lower()
            if prop_lower and occupier_type and not _types_compatible(prop_lower, occupier_type):
                items.append({
                    "signal_type": "cv_classification",
                    "description": (
                        f"CV classification '{occupier_type}' "
                        f"doesn't match property class '{property_class}'"
                    ),
                    "weight": WEIGHT_CV_CLASSIFICATION,
                    "raw_data": {
                        "occupier_type": occupier_type,
                        "property_class": property_class,
                        "flags": flags,
                    },
                })

    # SIC code mismatch
    if company_data and property_class:
        companies = company_data.get("companies", [])
        for company in companies:
            sic_codes = company.get("sic_codes", [])
            if sic_codes and not _sic_matches_class(sic_codes, property_class):
                items.append({
                    "signal_type": "sic_mismatch",
                    "description": (
                        f"SIC codes {sic_codes} for '{company.get('company_name', '')}' "
                        f"don't match property class '{property_class}'"
                    ),
                    "weight": WEIGHT_SIC_MISMATCH,
                    "raw_data": {
                        "company_name": company.get("company_name", ""),
                        "sic_codes": sic_codes,
                        "property_class": property_class,
                    },
                })
                break  # Only flag once per building

    # Licensing
    if licensing_data and licensing_data.get("found"):
        premises = licensing_data.get("premises", [])
        items.append({
            "signal_type": "licensing",
            "description": (
                f"Found {len(premises)} licensed premise(s) within vicinity: "
                + ", ".join(p["name"] for p in premises[:3])
            ),
            "weight": WEIGHT_LICENSING,
            "raw_data": {"premises": premises},
        })

    # Keyword hits from reviews and signage
    keywords_found = set()
    texts_to_scan = []

    if places_data:
        texts_to_scan.extend(places_data.get("review_snippets", []))
        texts_to_scan.append(places_data.get("trading_name", ""))

    if vision_data:
        texts_to_scan.extend(vision_data.get("signage_text", []))

    combined_text = " ".join(texts_to_scan).lower()
    for keyword in KEYWORD_LIST:
        if keyword in combined_text:
            keywords_found.add(keyword)

    if keywords_found:
        items.append({
            "signal_type": "keyword_hit",
            "description": f"Risk keywords found: {', '.join(sorted(keywords_found))}",
            "weight": WEIGHT_KEYWORD_HIT,
            "raw_data": {"keywords": sorted(keywords_found)},
        })

    return items


def _types_compatible(property_class: str, occupier_type: str) -> bool:
    """Basic heuristic: check if occupier type is broadly compatible with property class."""
    # Very simple matching — can be refined with a proper taxonomy
    class_lower = property_class.lower()
    occ_lower = occupier_type.lower()

    if class_lower in occ_lower or occ_lower in class_lower:
        return True

    compatible_map = {
        "office": ["office", "professional", "consultancy", "studio"],
        "retail": ["shop", "store", "retail", "boutique", "salon"],
        "restaurant": ["restaurant", "cafe", "food", "dining", "bistro"],
        "warehouse": ["warehouse", "storage", "industrial", "distribution"],
        "residential": ["residential", "flat", "apartment", "house"],
    }

    for cls, terms in compatible_map.items():
        if cls in class_lower:
            return any(t in occ_lower for t in terms)

    return True  # Default to compatible if we can't determine


def _sic_matches_class(sic_codes: list[str], property_class: str) -> bool:
    """Check if SIC codes are broadly compatible with property class."""
    # SIC codes: 47xxx = retail, 56xxx = food/beverage, 68xxx = real estate, etc.
    class_lower = property_class.lower()

    retail_sics = any(s.startswith("47") for s in sic_codes)
    food_sics = any(s.startswith("56") for s in sic_codes)
    office_sics = any(
        s.startswith(("62", "63", "64", "65", "66", "69", "70", "71", "72", "73"))
        for s in sic_codes
    )

    if "retail" in class_lower and retail_sics:
        return True
    if "restaurant" in class_lower and food_sics:
        return True
    if "food" in class_lower and food_sics:
        return True
    if "office" in class_lower and office_sics:
        return True

    return True  # Default to compatible
