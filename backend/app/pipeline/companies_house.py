import httpx


async def lookup_company(address: str, api_key: str) -> dict:
    """Search Companies House for companies registered at an address."""
    url = "https://api.company-information.service.gov.uk/search/companies"
    headers = {"Authorization": api_key}
    params = {"q": address, "items_per_page": 5}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

        items = data.get("items", [])
        if not items:
            return {"data": {"companies": []}, "error": None}

        companies = []
        for item in items:
            companies.append({
                "company_name": item.get("title", ""),
                "company_number": item.get("company_number", ""),
                "company_status": item.get("company_status", ""),
                "date_of_creation": item.get("date_of_creation", ""),
                "sic_codes": item.get("sic_codes", []),
                "address_snippet": item.get("address_snippet", ""),
            })

        return {"data": {"companies": companies}, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}
