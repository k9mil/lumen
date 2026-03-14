"""CompaniesHouseAgent - searches UK Companies House API."""

import httpx
from datetime import datetime
from typing import Any

from ..core.types import Result, AgentConfig, BaseAgent


class CompaniesHouseAgent(BaseAgent):
    """Agent for Companies House lookups.

    Input: {"address": "142 Union Street, Glasgow"} OR {"company_name": "Acme Ltd"}
    Output: {"companies": [{"company_name": "...", "company_number": "...", ...}]}
    """

    name = "companies_house"

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate that address or company_name is provided."""
        if not data.get("address") and not data.get("company_name"):
            return False, "Missing required field: address or company_name"
        return True, ""

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Search Companies House."""
        is_valid, error = self.validate_input(input_data)
        if not is_valid:
            return Result.fail(error, agent=self.name)

        key_check = self._requires_key(
            "companies_house_api_key", self.config.companies_house_api_key
        )
        if not key_check.success:
            return Result.fail(key_check.error or "Missing API key", agent=self.name)

        start_time = datetime.utcnow()

        # Build search query
        query = input_data.get("company_name") or input_data.get("address")

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(
                    "https://api.company-information.service.gov.uk/search/companies",
                    headers={"Authorization": self.config.companies_house_api_key},
                    params={"q": query, "items_per_page": 10},
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException:
            return Result.fail("Companies House API timeout", agent=self.name)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return Result.fail("Invalid Companies House API key", agent=self.name)
            return Result.fail(f"HTTP {e.response.status_code}", agent=self.name)
        except Exception as e:
            return Result.fail(f"Request failed: {str(e)}", agent=self.name)

        items = data.get("items", [])
        companies = []

        for item in items:
            companies.append(
                {
                    "company_name": item.get("title", ""),
                    "company_number": item.get("company_number", ""),
                    "company_status": item.get("company_status", ""),
                    "date_of_creation": item.get("date_of_creation", ""),
                    "date_of_cessation": item.get("date_of_cessation"),
                    "sic_codes": item.get("sic_codes", []),
                    "address_snippet": item.get("address_snippet", ""),
                    "company_type": item.get("company_type", ""),
                }
            )

        output = {"companies": companies, "total_results": data.get("total_results", 0)}

        end_time = datetime.utcnow()
        return Result.ok(
            output, agent=self.name, query=query, result_count=len(companies)
        ).with_timing(start_time, end_time)
