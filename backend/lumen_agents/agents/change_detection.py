"""ChangeDetectionAgent - compares snapshots to detect material changes."""

from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class ChangeDetectionAgent(BaseAgent):
    """Agent for detecting material changes between snapshots.

    Input: {
        "current": {"vision": {...}, "companies": {...}, "places": {...}, "licensing": {...}},
        "previous": {"vision": {...}, "companies": {...}, "places": {...}, "licensing": {...}}
    }
    Output: {
        "changed": True,
        "changes": [{"field": "occupier_type", "old": "...", "new": "...", "severity": "high"}]
    }
    """

    name = "change_detection"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate current and previous snapshots."""
        if not data.get("current"):
            return False, "Missing required field: current"
        if not data.get("previous"):
            return False, "Missing required field: previous"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Detect changes between snapshots."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        start_time = datetime.utcnow()

        current = input_data.get("current", {})
        previous = input_data.get("previous", {})

        changes = []

        # Compare vision data
        curr_vision = current.get("vision") or {}
        prev_vision = previous.get("vision") or {}

        if curr_vision and prev_vision:
            # Occupier type change
            curr_occ = curr_vision.get("occupier_type")
            prev_occ = prev_vision.get("occupier_type")
            if curr_occ != prev_occ:
                changes.append(
                    {
                        "field": "occupier_type",
                        "old": prev_occ,
                        "new": curr_occ,
                        "severity": "high",
                        "category": "vision",
                    }
                )

            # Signage change
            curr_signs = set(curr_vision.get("signage_text", []))
            prev_signs = set(prev_vision.get("signage_text", []))
            if curr_signs != prev_signs:
                changes.append(
                    {
                        "field": "signage_text",
                        "old": sorted(prev_signs),
                        "new": sorted(curr_signs),
                        "severity": "medium",
                        "category": "vision",
                    }
                )

            # Flags change
            curr_flags = set(curr_vision.get("flags", []))
            prev_flags = set(prev_vision.get("flags", []))
            new_flags = curr_flags - prev_flags
            if new_flags:
                changes.append(
                    {
                        "field": "vision_flags",
                        "old": sorted(prev_flags),
                        "new": sorted(curr_flags),
                        "severity": "high"
                        if any(f in ["vape_shop", "tobacco_shop", "closed"] for f in new_flags)
                        else "medium",
                        "category": "vision",
                    }
                )

        # Compare companies house data
        curr_companies = current.get("companies") or {}
        prev_companies = previous.get("companies") or {}

        if curr_companies and prev_companies:
            curr_names = {c.get("company_name") for c in curr_companies.get("companies", [])}
            prev_names = {c.get("company_name") for c in prev_companies.get("companies", [])}

            if curr_names != prev_names:
                changes.append(
                    {
                        "field": "registered_companies",
                        "old": sorted(prev_names),
                        "new": sorted(curr_names),
                        "severity": "high",
                        "category": "companies_house",
                    }
                )

        # Compare places data
        curr_places = current.get("places") or {}
        prev_places = previous.get("places") or {}

        if curr_places and prev_places:
            # Trading name change
            curr_name = curr_places.get("trading_name")
            prev_name = prev_places.get("trading_name")
            if curr_name != prev_name:
                changes.append(
                    {
                        "field": "trading_name",
                        "old": prev_name,
                        "new": curr_name,
                        "severity": "high",
                        "category": "places",
                    }
                )

            # Business type change
            curr_types = set(curr_places.get("types", []))
            prev_types = set(prev_places.get("types", []))
            if curr_types != prev_types:
                changes.append(
                    {
                        "field": "business_types",
                        "old": sorted(prev_types),
                        "new": sorted(curr_types),
                        "severity": "medium",
                        "category": "places",
                    }
                )

        # Compare licensing
        curr_lic = current.get("licensing") or {}
        prev_lic = previous.get("licensing") or {}

        if curr_lic and prev_lic:
            # New licenses appearing
            if curr_lic.get("found") and not prev_lic.get("found"):
                changes.append(
                    {
                        "field": "licensing_status",
                        "old": "none",
                        "new": f"{len(curr_lic.get('premises', []))} license(s)",
                        "severity": "high",
                        "category": "licensing",
                    }
                )
            elif curr_lic.get("found") and prev_lic.get("found"):
                # Compare license counts
                curr_count = len(curr_lic.get("premises", []))
                prev_count = len(prev_lic.get("premises", []))
                if curr_count != prev_count:
                    changes.append(
                        {
                            "field": "license_count",
                            "old": prev_count,
                            "new": curr_count,
                            "severity": "medium",
                            "category": "licensing",
                        }
                    )

        # Determine if material change occurred
        # Material = any high severity change, or multiple medium changes
        high_severity = [c for c in changes if c["severity"] == "high"]
        medium_severity = [c for c in changes if c["severity"] == "medium"]

        is_material = len(high_severity) > 0 or len(medium_severity) >= 2

        output = {
            "changed": len(changes) > 0,
            "material_change": is_material,
            "changes": changes,
            "high_severity_count": len(high_severity),
            "medium_severity_count": len(medium_severity),
        }

        end_time = datetime.utcnow()
        return Result.ok(
            output,
            agent=self.name,
            fields_checked=4,  # vision, companies, places, licensing
        ).with_timing(start_time, end_time)
