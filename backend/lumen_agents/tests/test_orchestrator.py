"""Test the orchestrator with real APIs."""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(env_path)

from lumen_agents import AgentConfig
from lumen_agents.orchestrator import PipelineOrchestrator


async def test_orchestrator():
    """Run orchestrator on a real address."""
    print("=" * 70)
    print("TESTING PIPELINE ORCHESTRATOR")
    print("=" * 70)

    config = AgentConfig(
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        companies_house_api_key=os.getenv("COMPANIES_HOUSE_API_KEY", ""),
        timeout_seconds=15,
    )

    orchestrator = PipelineOrchestrator(config)

    # Test building
    building_id = 1
    address = "142 Union Street, Glasgow G1 3QQ"
    property_class = "Office"  # Simulate insured as office

    print(f"\nBuilding ID: {building_id}")
    print(f"Address: {address}")
    print(f"Property Class: {property_class}")
    print()

    # Run pipeline
    result = await orchestrator.run_pipeline(
        building_id=building_id,
        address=address,
        property_class=property_class,
        previous_snapshot=None,  # First run - no previous data
    )

    # Display results
    print("\n" + "=" * 70)
    print("PIPELINE RESULTS")
    print("=" * 70)

    print(f"\n✓ Success: {result.success}")
    print(f"✓ Duration: {result.duration_ms:.0f}ms")

    print(f"\n📍 Geocoding:")
    if result.geocode_data:
        print(f"   Lat/Lng: {result.geocode_data['lat']:.6f}, {result.geocode_data['lng']:.6f}")
        print(f"   Place ID: {result.geocode_data['place_id'][:40]}...")

    print(f"\n🏢 Companies House:")
    if result.companies_house_data:
        companies = result.companies_house_data.get("companies", [])
        print(f"   Found {len(companies)} companies")
        for c in companies[:2]:
            print(f"   - {c['company_name']} ({c['company_status']})")
    else:
        print("   No data (API key missing or error)")

    print(f"\n📸 Street View:")
    if result.street_view_data:
        count = result.street_view_data.get("image_count", 0)
        print(f"   Images: {count}/4")

    print(f"\n🤖 Vision Analysis:")
    if result.vision_data:
        print(f"   Occupier: {result.vision_data['occupier_type']}")
        print(f"   Confidence: {result.vision_data['confidence']:.0%}")
        if result.vision_data.get("signage_text"):
            print(f"   Signage: {', '.join(result.vision_data['signage_text'][:5])}")
        if result.vision_data.get("flags"):
            print(f"   Flags: {', '.join(result.vision_data['flags'])}")
    else:
        print("   No vision data")

    print(f"\n📋 Licensing:")
    if result.licensing_data:
        found = result.licensing_data.get("found", False)
        count = len(result.licensing_data.get("premises", []))
        print(f"   Nearby licenses: {count}")

    print(f"\n⚠️  Risk Assessment:")
    print(f"   Score: {result.score}/100")
    print(f"   Tier: {result.tier.upper()}")
    print(f"   Evidence items: {len(result.evidence_items)}")
    for item in result.evidence_items:
        print(f"   - {item['signal_type']}: +{item['weight']}pts")
        print(f"     {item['description'][:60]}...")

    print(f"\n🔄 Change Detection:")
    print(f"   Changed: {result.changed}")
    print(f"   Material change: {result.material_change}")
    if result.changes:
        print(f"   Changes ({len(result.changes)}):")
        for change in result.changes:
            print(f"   - {change['field']} ({change['severity']})")

    if result.errors:
        print(f"\n⚠️  Errors ({len(result.errors)}):")
        for error in result.errors:
            print(f"   - {error}")

    # Recommendation
    print("\n" + "=" * 70)
    if result.tier in ["high", "critical"]:
        print("🚨 RECOMMENDATION: NEEDS REVIEW")
        print(f"   Risk score {result.score}/100 indicates significant risk signals")
    elif result.tier == "medium":
        print("📋 RECOMMENDATION: MONITOR")
        print("   Some risk factors present - continue monitoring")
    else:
        print("✅ RECOMMENDATION: LOW RISK")
        print("   No significant risk signals detected")
    print("=" * 70)

    return result


async def test_with_previous_snapshot():
    """Test change detection with simulated previous data."""
    print("\n\n" + "=" * 70)
    print("TESTING CHANGE DETECTION (with previous snapshot)")
    print("=" * 70)

    config = AgentConfig(google_api_key=os.getenv("GOOGLE_API_KEY", ""), timeout_seconds=15)

    orchestrator = PipelineOrchestrator(config)

    # Simulate previous run (e.g., from 30 days ago)
    previous_snapshot = {
        "vision_data": {
            "occupier_type": "office",
            "signage_text": ["Smith & Co Solicitors"],
            "confidence": 0.9,
            "flags": [],
        },
        "companies_house_data": {
            "companies": [{"company_name": "Smith & Co Ltd", "company_status": "active"}]
        },
        "licensing_data": {"found": False, "premises": []},
    }

    address = "142 Union Street, Glasgow G1 3QQ"
    property_class = "Office"

    print(f"\nPrevious state:")
    print(f"  Occupier: {previous_snapshot['vision_data']['occupier_type']}")
    print(f"  Signage: {previous_snapshot['vision_data']['signage_text']}")
    print(f"\nRunning pipeline to detect changes...")

    result = await orchestrator.run_pipeline(
        building_id=2,
        address=address,
        property_class=property_class,
        previous_snapshot=previous_snapshot,
    )

    print(f"\n✓ Pipeline completed in {result.duration_ms:.0f}ms")
    print(f"\n🔄 Change Detection Results:")
    print(f"   Material change detected: {result.material_change}")
    print(f"   Changes: {len(result.changes)}")

    for change in result.changes:
        print(f"\n   - {change['field']} ({change['severity']})")
        print(f"     From: {change.get('old', 'N/A')}")
        print(f"     To: {change.get('new', 'N/A')}")

    print(f"\n⚠️  Final Risk Score: {result.score}/100 ({result.tier.upper()})")

    if result.material_change:
        print("\n🚨 MATERIAL CHANGE DETECTED - Building flagged for review")


async def main():
    """Run all orchestrator tests."""
    if not os.getenv("GOOGLE_API_KEY"):
        print("ERROR: GOOGLE_API_KEY not set in .env")
        return

    # Test 1: Fresh run
    await test_orchestrator()

    # Test 2: With previous snapshot (change detection)
    await test_with_previous_snapshot()

    print("\n\n✅ All orchestrator tests complete!")


if __name__ == "__main__":
    asyncio.run(main())
