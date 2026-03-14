"""Test Companies House integration specifically."""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(env_path)

from lumen_agents import AgentConfig, CompaniesHouseAgent


async def test_companies_house():
    """Test Companies House agent."""
    print("=" * 70)
    print("COMPANIES HOUSE API TEST")
    print("=" * 70)

    ch_key = os.getenv("COMPANIES_HOUSE_API_KEY", "")

    if not ch_key or ch_key == "your-companies-house-api-key-here":
        print("\n❌ No Companies House API key found in .env")
        print("\nTo get an API key:")
        print("1. Go to: https://developer.company-information.service.gov.uk/")
        print("2. Click 'Register' or 'Sign in'")
        print("3. Create a new application")
        print("4. Generate an API key")
        print("5. Copy the key and add to .env:")
        print("   COMPANIES_HOUSE_API_KEY=your-key-here")
        return

    config = AgentConfig(companies_house_api_key=ch_key)
    agent = CompaniesHouseAgent(config)

    # Test addresses
    test_addresses = [
        "10 Downing Street, London",
        "142 Union Street, Glasgow",
    ]

    for address in test_addresses:
        print(f"\n{'=' * 70}")
        print(f"Searching: {address}")
        print("=" * 70)

        result = await agent.execute({"address": address})

        if result.success:
            companies = result.data.get("companies", [])
            print(f"✓ Found {len(companies)} companies")

            for i, company in enumerate(companies[:3], 1):
                print(f"\n  {i}. {company['company_name']}")
                print(f"     Number: {company['company_number']}")
                print(f"     Status: {company['company_status']}")
                print(f"     SIC Codes: {company.get('sic_codes', [])}")
                print(f"     Address: {company.get('address_snippet', 'N/A')[:50]}...")
        else:
            print(f"✗ Error: {result.error}")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    asyncio.run(test_companies_house())
