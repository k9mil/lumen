"""Quick test script for agents."""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (parent of backend directory)
env_path = Path(__file__).resolve().parents[4] / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded .env from {env_path}")
else:
    print("Warning: No .env file found at project root")

from lumen_agents import (
    AgentConfig,
    GeocodeAgent,
    CompaniesHouseAgent,
    ScoringAgent,
    ChangeDetectionAgent,
)


async def test_geocode():
    """Test GeocodeAgent."""
    print("\n=== Testing GeocodeAgent ===")

    config = AgentConfig(google_api_key=os.getenv("GOOGLE_API_KEY", ""), timeout_seconds=10)

    agent = GeocodeAgent(config)

    # Test with valid address
    result = await agent.execute({"address": "10 Downing Street, London SW1A 2AA"})

    print(f"Success: {result.success}")
    if result.success:
        print(f"Place ID: {result.data.get('place_id', 'N/A')[:30]}...")
        print(f"Lat/Lng: {result.data.get('lat')}, {result.data.get('lng')}")
        print(f"Duration: {result.metadata.get('duration_ms', 'N/A')}ms")
    else:
        print(f"Error: {result.error}")

    # Test validation
    valid, error = agent.validate_input({"address": ""})
    print(f"Validation empty address: valid={valid}, error={error}")


async def test_scoring():
    """Test ScoringAgent."""
    print("\n=== Testing ScoringAgent ===")

    config = AgentConfig()
    agent = ScoringAgent(config)

    # Test with sample data
    result = await agent.execute(
        {
            "vision_data": {
                "occupier_type": "vape shop",
                "signage_text": ["VapeWorld", "E-Cigarettes"],
                "confidence": 0.95,
                "flags": ["vape_shop"],
            },
            "companies_house_data": {
                "companies": [
                    {
                        "company_name": "VapeWorld Glasgow Ltd",
                        "sic_codes": ["47110"],  # Retail sale in non-specialised stores
                        "company_status": "active",
                    }
                ]
            },
            "places_data": {
                "trading_name": "VapeWorld Glasgow",
                "review_snippets": ["Great vape shop", "Good prices on e-cigs"],
            },
            "licensing_data": {
                "found": True,
                "premises": [{"name": "The Pub", "type": "alcohol", "distance_m": 45.2}],
                "search_radius_m": 100,
            },
            "property_class": "Retail",
            "previous_vision": {"occupier_type": "newsagent"},
        }
    )

    print(f"Success: {result.success}")
    if result.success:
        print(f"Score: {result.data['score']}")
        print(f"Tier: {result.data['tier']}")
        print(f"Evidence items: {len(result.data['evidence_items'])}")
        for item in result.data["evidence_items"]:
            print(f"  - {item['signal_type']}: {item['weight']}pts")
    else:
        print(f"Error: {result.error}")


async def test_change_detection():
    """Test ChangeDetectionAgent."""
    print("\n=== Testing ChangeDetectionAgent ===")

    config = AgentConfig()
    agent = ChangeDetectionAgent(config)

    result = await agent.execute(
        {
            "current": {
                "vision": {
                    "occupier_type": "vape shop",
                    "signage_text": ["VapeWorld"],
                    "flags": ["vape_shop"],
                },
                "companies": {"companies": [{"company_name": "VapeWorld Ltd"}]},
                "places": {"trading_name": "VapeWorld", "types": ["store", "point_of_interest"]},
            },
            "previous": {
                "vision": {
                    "occupier_type": "newsagent",
                    "signage_text": ["Corner Shop"],
                    "flags": [],
                },
                "companies": {"companies": [{"company_name": "Corner Shop Ltd"}]},
                "places": {"trading_name": "Corner Shop", "types": ["convenience_store"]},
            },
        }
    )

    print(f"Success: {result.success}")
    if result.success:
        print(f"Changed: {result.data['changed']}")
        print(f"Material change: {result.data['material_change']}")
        print(f"Changes detected: {len(result.data['changes'])}")
        for change in result.data["changes"]:
            print(
                f"  - {change['field']} ({change['severity']}): {change.get('old', 'N/A')} -> {change.get('new', 'N/A')}"
            )
    else:
        print(f"Error: {result.error}")


async def main():
    """Run all tests."""
    print("Lumen Agents Test Suite")
    print("=" * 50)

    # Run tests
    await test_geocode()
    await test_scoring()
    await test_change_detection()

    print("\n" + "=" * 50)
    print("Tests complete!")


if __name__ == "__main__":
    asyncio.run(main())
