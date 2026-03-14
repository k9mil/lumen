"""Integration test - actually calls APIs to verify agents work."""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (3 levels up from this file: tests -> lumen_agents -> backend -> project_root)
env_path = Path(__file__).resolve().parents[3] / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✓ Loaded .env from {env_path}")
else:
    print(f"✗ No .env found at {env_path}")
    print("  Please create .env in project root with GOOGLE_API_KEY and COMPANIES_HOUSE_API_KEY")
    exit(1)

from lumen_agents import (
    AgentConfig,
    GeocodeAgent,
    CompaniesHouseAgent,
    PlacesAgent,
    StreetViewAgent,
    VisionAgent,
    LicensingAgent,
    ScoringAgent,
    ChangeDetectionAgent,
)

# Check API keys
goog_key = os.getenv("GOOGLE_API_KEY", "")
ch_key = os.getenv("COMPANIES_HOUSE_API_KEY", "")

print(f"\nAPI Keys:")
print(f"  Google API Key: {'✓ Set' if goog_key else '✗ Missing'}")
print(f"  Companies House Key: {'✓ Set' if ch_key else '✗ Missing'}")


async def test_geocode_real():
    """Test GeocodeAgent with real Google API."""
    print("\n" + "=" * 60)
    print("Testing GeocodeAgent (Google Geocoding API)")
    print("=" * 60)

    config = AgentConfig(google_api_key=goog_key, timeout_seconds=10)
    agent = GeocodeAgent(config)

    test_address = "10 Downing Street, London SW1A 2AA"
    print(f"\nAddress: {test_address}")

    result = await agent.execute({"address": test_address})

    if result.success:
        print(f"✓ SUCCESS")
        print(f"  Place ID: {result.data['place_id'][:40]}...")
        print(f"  Coordinates: {result.data['lat']:.6f}, {result.data['lng']:.6f}")
        print(f"  Formatted: {result.data['formatted_address']}")
        print(f"  Duration: {result.metadata.get('duration_ms')}ms")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_companies_house_real():
    """Test CompaniesHouseAgent with real API."""
    print("\n" + "=" * 60)
    print("Testing CompaniesHouseAgent (Companies House API)")
    print("=" * 60)

    config = AgentConfig(companies_house_api_key=ch_key, timeout_seconds=10)
    agent = CompaniesHouseAgent(config)

    # Search for a well-known company
    test_query = "VapeWorld Glasgow"
    print(f"\nQuery: {test_query}")

    result = await agent.execute({"company_name": test_query})

    if result.success:
        print(f"✓ SUCCESS")
        companies = result.data.get("companies", [])
        print(f"  Found {len(companies)} companies")
        for c in companies[:3]:
            print(f"    - {c['company_name']} ({c['company_status']})")
            print(f"      SIC: {c.get('sic_codes', [])}")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_places_real():
    """Test PlacesAgent with real Google API."""
    print("\n" + "=" * 60)
    print("Testing PlacesAgent (Google Places API)")
    print("=" * 60)

    config = AgentConfig(google_api_key=goog_key, timeout_seconds=10)
    agent = PlacesAgent(config)

    # Use Downing Street place ID (well-known)
    test_place_id = "ChIJbSSmrq8EdkgRvL2FPzCX8Xs"
    print(f"\nPlace ID: {test_place_id}")

    result = await agent.execute({"place_id": test_place_id})

    if result.success:
        print(f"✓ SUCCESS")
        print(f"  Name: {result.data['trading_name']}")
        print(f"  Types: {', '.join(result.data['types'][:3])}")
        print(f"  Rating: {result.data['rating']}")
        print(f"  Duration: {result.metadata.get('duration_ms')}ms")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_street_view_real():
    """Test StreetViewAgent with real Google API."""
    print("\n" + "=" * 60)
    print("Testing StreetViewAgent (Street View Static API)")
    print("=" * 60)

    config = AgentConfig(google_api_key=goog_key, timeout_seconds=15)
    agent = StreetViewAgent(config)

    # Coordinates for Downing Street
    lat, lng = 51.5034, -0.1276
    print(f"\nCoordinates: {lat}, {lng}")

    result = await agent.execute({"lat": lat, "lng": lng})

    if result.success:
        print(f"✓ SUCCESS")
        images = result.data.get("images", {})
        for direction, img_data in images.items():
            size = len(img_data) if img_data else 0
            status = f"✓ {size} bytes" if img_data else "✗ No image"
            print(f"  {direction.capitalize()}: {status}")
        print(f"  Total fetched: {result.data['image_count']}/4")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_vision_real():
    """Test VisionAgent with real Gemini API."""
    print("\n" + "=" * 60)
    print("Testing VisionAgent (Gemini 3.1 Pro Vision)")
    print("=" * 60)

    # First get street view images
    sv_config = AgentConfig(google_api_key=goog_key, timeout_seconds=15)
    sv_agent = StreetViewAgent(sv_config)

    print("\nFetching street view images...")
    sv_result = await sv_agent.execute({"lat": 51.5034, "lng": -0.1276})

    if not sv_result.success or sv_result.data.get("image_count", 0) == 0:
        print("✗ FAILED: Could not fetch street view images")
        return None

    print(f"✓ Got {sv_result.data['image_count']} images, analyzing with Gemini...")

    config = AgentConfig(google_api_key=goog_key)
    agent = VisionAgent(config)

    result = await agent.execute({"images": sv_result.data["images"]})

    if result.success:
        print(f"✓ SUCCESS")
        print(f"  Occupier Type: {result.data['occupier_type']}")
        print(f"  Confidence: {result.data['confidence']}")
        print(f"  Flags: {result.data['flags']}")
        if result.data.get("signage_text"):
            print(f"  Signage: {', '.join(result.data['signage_text'][:5])}")
        print(f"  Duration: {result.metadata.get('duration_ms')}ms")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_licensing_real():
    """Test LicensingAgent with Glasgow data."""
    print("\n" + "=" * 60)
    print("Testing LicensingAgent (Glasgow Licensed Premises)")
    print("=" * 60)

    config = AgentConfig()
    # Glasgow city center coordinates
    agent = LicensingAgent(config)

    lat, lng = 55.8609, -4.2514  # Royal Exchange Square area
    print(f"\nCoordinates: {lat}, {lng} (Glasgow)")
    print("Searching 100m radius...")

    result = await agent.execute({"lat": lat, "lng": lng, "radius_m": 100})

    if result.success:
        print(f"✓ SUCCESS")
        print(f"  Found: {result.data['found']}")
        print(f"  Premises: {len(result.data.get('premises', []))}")
        for p in result.data.get("premises", [])[:5]:
            print(f"    - {p['name']} ({p['type']}, {p['distance_m']}m)")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_scoring_real():
    """Test ScoringAgent with realistic data."""
    print("\n" + "=" * 60)
    print("Testing ScoringAgent (Risk Scoring)")
    print("=" * 60)

    config = AgentConfig()
    agent = ScoringAgent(config)

    # Simulate a vape shop that changed from newsagent
    test_data = {
        "vision_data": {
            "occupier_type": "vape shop",
            "signage_text": ["VapeWorld", "E-Cigarettes", "CBD Oil"],
            "confidence": 0.95,
            "flags": ["vape_shop", "tobacco_shop"],
        },
        "companies_house_data": {
            "companies": [
                {
                    "company_name": "VapeWorld Glasgow Ltd",
                    "sic_codes": ["47110"],  # Retail
                    "company_status": "active",
                }
            ]
        },
        "places_data": {
            "trading_name": "VapeWorld Glasgow",
            "types": ["store", "point_of_interest"],
            "review_snippets": [
                {"text": "Great vape shop with good prices on e-cigs"},
                {"text": "Wide selection of tobacco and shisha"},
            ],
        },
        "licensing_data": {
            "found": True,
            "premises": [{"name": "The Horseshoe Bar", "type": "alcohol", "distance_m": 45.2}],
            "search_radius_m": 100,
        },
        "property_class": "Retail",
        "previous_vision": {
            "occupier_type": "newsagent",
            "signage_text": ["Corner Shop"],
            "flags": [],
        },
    }

    print("\nTest case: Newsagent → Vape shop change")
    print("  - CV classification mismatch")
    print("  - SIC code check")
    print("  - Keywords: vape, tobacco, shisha")
    print("  - Nearby licensed premises")

    result = await agent.execute(test_data)

    if result.success:
        print(f"\n✓ SUCCESS")
        print(f"  Risk Score: {result.data['score']}/100")
        print(f"  Tier: {result.data['tier'].upper()}")
        print(f"  Evidence items ({len(result.data['evidence_items'])}):")
        for item in result.data["evidence_items"]:
            print(f"    - {item['signal_type']}: +{item['weight']}pts")
            print(f"      {item['description']}")
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def test_change_detection_real():
    """Test ChangeDetectionAgent."""
    print("\n" + "=" * 60)
    print("Testing ChangeDetectionAgent (Snapshot Comparison)")
    print("=" * 60)

    config = AgentConfig()
    agent = ChangeDetectionAgent(config)

    test_data = {
        "current": {
            "vision": {
                "occupier_type": "vape shop",
                "signage_text": ["VapeWorld"],
                "flags": ["vape_shop"],
            },
            "companies": {"companies": [{"company_name": "VapeWorld Ltd"}]},
            "places": {"trading_name": "VapeWorld", "types": ["store", "point_of_interest"]},
            "licensing": {"found": True, "premises": [{"name": "The Pub"}]},
        },
        "previous": {
            "vision": {"occupier_type": "newsagent", "signage_text": ["Corner Shop"], "flags": []},
            "companies": {"companies": [{"company_name": "Corner Shop Ltd"}]},
            "places": {"trading_name": "Corner Shop", "types": ["convenience_store"]},
            "licensing": {"found": False, "premises": []},
        },
    }

    print("\nComparing: Newsagent → Vape shop")

    result = await agent.execute(test_data)

    if result.success:
        print(f"\n✓ SUCCESS")
        print(f"  Changed: {result.data['changed']}")
        print(f"  Material change: {result.data['material_change']}")
        print(f"  Changes detected ({len(result.data['changes'])}):")
        for change in result.data["changes"]:
            print(
                f"    - {change['field']} ({change['severity']}): {change['old']} → {change['new']}"
            )
        return result.data
    else:
        print(f"✗ FAILED: {result.error}")
        return None


async def main():
    """Run all integration tests."""
    print("\n" + "=" * 60)
    print("LUMEN AGENTS - INTEGRATION TEST SUITE")
    print("=" * 60)

    results = {}

    # Run tests that don't require API keys first
    results["scoring"] = await test_scoring_real()
    results["change_detection"] = await test_change_detection_real()

    # Only run API tests if keys are available
    if goog_key:
        results["geocode"] = await test_geocode_real()
        results["places"] = await test_places_real()
        results["street_view"] = await test_street_view_real()
        results["vision"] = await test_vision_real()
        results["licensing"] = await test_licensing_real()
    else:
        print("\n" + "=" * 60)
        print("SKIPPING API TESTS - No Google API key")
        print("=" * 60)

    if ch_key:
        results["companies_house"] = await test_companies_house_real()
    else:
        print("\n" + "=" * 60)
        print("SKIPPING Companies House - No API key")
        print("=" * 60)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in results.values() if r is not None)
    total = len(results)

    for name, result in results.items():
        status = "✓" if result else "✗"
        print(f"  {status} {name}")

    print(f"\n{passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All agents working!")
    else:
        print(f"\n⚠️  {total - passed} agent(s) failed")


if __name__ == "__main__":
    asyncio.run(main())
