def detect_changes(current_snapshot: dict, previous_snapshot: dict) -> dict:
    """Compare two snapshots and detect material changes."""
    diffs = []

    # Compare vision analysis
    curr_vision = current_snapshot.get("street_view_analysis") or {}
    prev_vision = previous_snapshot.get("street_view_analysis") or {}

    if curr_vision.get("occupier_type") != prev_vision.get("occupier_type"):
        diffs.append({
            "field": "occupier_type",
            "old": prev_vision.get("occupier_type"),
            "new": curr_vision.get("occupier_type"),
            "severity": "high",
        })

    if set(curr_vision.get("signage_text", [])) != set(prev_vision.get("signage_text", [])):
        diffs.append({
            "field": "signage_text",
            "old": prev_vision.get("signage_text", []),
            "new": curr_vision.get("signage_text", []),
            "severity": "medium",
        })

    # Compare company data
    curr_company = current_snapshot.get("companies_house_data") or {}
    prev_company = previous_snapshot.get("companies_house_data") or {}

    curr_companies = curr_company.get("companies", [])
    prev_companies = prev_company.get("companies", [])

    curr_names = {c.get("company_name") for c in curr_companies}
    prev_names = {c.get("company_name") for c in prev_companies}

    if curr_names != prev_names:
        diffs.append({
            "field": "registered_companies",
            "old": sorted(prev_names),
            "new": sorted(curr_names),
            "severity": "high",
        })

    # Compare places data
    curr_places = current_snapshot.get("places_data") or {}
    prev_places = previous_snapshot.get("places_data") or {}

    if curr_places.get("trading_name") != prev_places.get("trading_name"):
        diffs.append({
            "field": "trading_name",
            "old": prev_places.get("trading_name"),
            "new": curr_places.get("trading_name"),
            "severity": "medium",
        })

    if set(curr_places.get("types", [])) != set(prev_places.get("types", [])):
        diffs.append({
            "field": "place_types",
            "old": prev_places.get("types", []),
            "new": curr_places.get("types", []),
            "severity": "medium",
        })

    # Compare licensing
    curr_lic = current_snapshot.get("licensing_data") or {}
    prev_lic = previous_snapshot.get("licensing_data") or {}

    if curr_lic.get("found") and not prev_lic.get("found"):
        diffs.append({
            "field": "licensing",
            "old": None,
            "new": curr_lic.get("premises", []),
            "severity": "high",
        })

    return {
        "changed": len(diffs) > 0,
        "diffs": diffs,
    }
