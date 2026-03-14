from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    building_id: int
    run_at: datetime
    geocode_data: dict[str, Any] | None = None
    companies_house_data: dict[str, Any] | None = None
    places_data: dict[str, Any] | None = None
    street_view_analysis: dict[str, Any] | None = None
    licensing_data: dict[str, Any] | None = None
    risk_score: int
    risk_tier: str
