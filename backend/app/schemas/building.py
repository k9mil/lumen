from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BuildingCreate(BaseModel):
    address: str
    property_class: str = ""


class BuildingBulkUpload(BaseModel):
    buildings: list[BuildingCreate]


class BuildingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    insurer_id: int
    address: str
    property_class: str
    place_id: str | None = None
    lat: float | None = None
    lng: float | None = None
    status: str
    risk_score: int
    risk_tier: str
    created_at: datetime
    updated_at: datetime


class BuildingListResponse(BaseModel):
    buildings: list[BuildingResponse]
    total: int
