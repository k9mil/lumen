"""End-to-end demo with real APIs - no mocks.

This demonstrates the full pipeline using real data from Google APIs and Companies House.
Requires: GOOGLE_API_KEY and COMPANIES_HOUSE_API_KEY in environment
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(env_path)

from lumen_agents import (
    AgentConfig,
    GeocodeAgent,
    CompaniesHouseAgent,
    StreetViewAgent,
    VisionAgent,
    ScoringAgent,
    ChangeDetectionAgent,
)


async def run_real_pipeline(address: str):
    """Run full pipeline on a real address."""
    print("=" * 70)
    print(f"LUMEN PIPELINE - REAL DATA")
    print(f"Address: {address}")
    print("=" * 70)

    config = AgentConfig(
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        companies_house_api_key=os.getenv("COMPANIES_HOUSE_API_KEY", ""),
        timeout_seconds=15,
    )

    # Step 1: Geocode
    print("\n[1/6] GEOCODING...")
    geo_agent = GeocodeAgent(config)
    geo_result = await geo_agent.execute({"address": address})

    if not geo_result.success:
        print(f"✗ Geocoding failed: {geo_result.error}")
        return

    lat = geo_result.data["lat"]
    lng = geo_result.data["lng"]
    place_id = geo_result.data["place_id"]

    print(f"✓ Located: {lat:.6f}, {lng:.6f}")
    print(f"  Place ID: {place_id[:40]}...")
    print(f"  Formatted: {geo_result.data['formatted_address']}")

    # Step 2: Companies House
    print("\n[2/6] COMPANIES HOUSE LOOKUP...")
    ch_agent = CompaniesHouseAgent(config)
    ch_result = await ch_agent.execute({"address": address})

    if not ch_result.success:
        print(f"⚠ Companies House failed: {ch_result.error}")
        print("  (No CH API key or API error)")
        companies_data = None
    else:
        companies_data = ch_result.data
        companies = companies_data.get("companies", [])
        print(f"✓ Found {len(companies)} registered company(s):")
        for c in companies[:3]:  # Show first 3
            print(f"  - {c['company_name']}")
            print(f"    Status: {c['company_status']}, SIC: {c.get('sic_codes', [])}")

    # Step 3: Street View
    print("\n[3/6] FETCHING STREET VIEW IMAGES...")
    sv_agent = StreetViewAgent(config)
    sv_result = await sv_agent.execute({"lat": lat, "lng": lng})

    if not sv_result.success:
        print(f"✗ Street view failed: {sv_result.error}")
        return

    images = sv_result.data["images"]
    image_count = sv_result.data["image_count"]

    print(f"✓ Fetched {image_count}/4 images:")
    for direction in ["north", "east", "south", "west"]:
        img = images.get(direction)
        size_kb = len(img) / 1024 if img else 0
        status = f"{size_kb:.1f} KB" if img else "MISSING"
        print(f"  {direction.capitalize()}: {status}")

    # Step 4: Vision Analysis
    print("\n[4/6] VISION ANALYSIS (Gemini)...")
    vision_agent = VisionAgent(config)
    vision_result = await vision_agent.execute({"images": images})

    if not vision_result.success:
        print(f"⚠ Vision analysis failed: {vision_result.error}")
        print("  (API may still be propagating - wait a few minutes)")
        vision_data = None
    else:
        vision_data = vision_result.data
        print(f"✓ Analysis complete:")
        print(f"  Occupier Type: {vision_data['occupier_type']}")
        print(f"  Confidence: {vision_data['confidence']:.0%}")
        if vision_data["flags"]:
            print(f"  Flags: {', '.join(vision_data['flags'])}")
        if vision_data["signage_text"]:
            print(f"  Signage: {', '.join(vision_data['signage_text'][:3])}")

    # Step 5: Scoring
    print("\n[5/6] RISK SCORING...")

    # Simulate previous state for demo
    previous_vision = (
        {"occupier_type": "office", "signage_text": [], "flags": []} if vision_data else None
    )

    scoring_data = {
        "vision_data": vision_data,
        "companies_house_data": companies_data,
        "places_data": None,  # Skip for demo
        "licensing_data": {"found": False, "premises": []},
        "property_class": "Office",  # Assume insured as office
        "previous_vision": previous_vision if vision_data else None,
    }

    scoring_agent = ScoringAgent(config)
    scoring_result = await scoring_agent.execute(scoring_data)

    if not scoring_result.success:
        print(f"✗ Scoring failed: {scoring_result.error}")
        return

    score = scoring_result.data["score"]
    tier = scoring_result.data["tier"]

    print(f"✓ Risk Assessment:")
    print(f"  Score: {score}/100")
    print(f"  Tier: {tier.upper()}")
    print(f"  Evidence ({len(scoring_result.data['evidence_items'])}):")
    for item in scoring_result.data["evidence_items"]:
        print(f"    - {item['signal_type']}: +{item['weight']}pts")
        print(f"      {item['description']}")

    # Step 6: Change Detection
    print("\n[6/6] CHANGE DETECTION...")
    if previous_vision and vision_data:
        change_data = {
            "current": {
                "vision": vision_data,
                "companies": companies_data or {"companies": []},
                "places": {"trading_name": "", "types": []},
                "licensing": {"found": False},
            },
            "previous": {
                "vision": previous_vision,
                "companies": {"companies": []},
                "places": {"trading_name": "", "types": []},
                "licensing": {"found": False},
            },
        }

        change_agent = ChangeDetectionAgent(config)
        change_result = await change_agent.execute(change_data)

        if change_result.success:
            print(f"✓ Changes detected: {change_result.data['changed']}")
            print(f"  Material change: {change_result.data['material_change']}")
            for change in change_result.data["changes"]:
                print(f"    - {change['field']} ({change['severity']})")
        else:
            print(f"⚠ Change detection failed: {change_result.error}")
    else:
        print("  Skipped (no previous data)")

    # Summary
    print("\n" + "=" * 70)
    print("PIPELINE COMPLETE")
    print("=" * 70)
    print(f"Address: {geo_result.data['formatted_address']}")
    print(f"Coordinates: {lat:.6f}, {lng:.6f}")
    if companies_data and companies_data.get("companies"):
        c = companies_data["companies"][0]
        print(f"Registered: {c['company_name']} ({c['company_status']})")
    if vision_data:
        print(f"Detected Use: {vision_data['occupier_type']}")
    print(f"Risk Score: {score}/100 ({tier.upper()})")

    if tier in ["high", "critical"]:
        print("\n⚠️  RECOMMENDATION: Needs Review")
        print("   Significant risk signals detected")
    elif tier == "medium":
        print("\n📋 RECOMMENDATION: Monitor")
        print("   Some risk factors present")
    else:
        print("\n✅ RECOMMENDATION: Low Risk")


async def main():
    """Run demo on sample addresses."""

    if not os.getenv("GOOGLE_API_KEY"):
        print("ERROR: GOOGLE_API_KEY not set in .env")
        print("Add to .env: GOOGLE_API_KEY=your-key-here")
        return

    # Test addresses
    addresses = [
        "10 Downing Street, London SW1A 2AA",
        # Add more addresses to test
    ]

    for address in addresses:
        await run_real_pipeline(address)
        print("\n" + "=" * 70)
        print("\n")


if __name__ == "__main__":
    asyncio.run(main())
