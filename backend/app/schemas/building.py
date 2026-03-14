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
    tenant: str | None = None
    registered_use: str | None = None
    detected_use: str | None = None
    use_mismatch: bool = False
    listed: bool = False
    assigned_to: str | None = None
    property_type: str | None = None
    created_at: datetime
    updated_at: datetime


class SignalResponse(BaseModel):
    id: str
    source: str
    severity: str
    description: str
    timestamp: str


class DashboardBuildingResponse(BaseModel):
    """Building response shaped for the frontend dashboard."""
    id: str
    address: str
    tenant: str
    riskScore: int
    riskTrend: str
    riskTier: str
    status: str
    propertyType: str
    listed: bool
    registeredUse: str
    detectedUse: str
    useMismatch: bool
    lat: float
    lng: float
    lastUpdated: str
    assignedTo: str | None
    signals: list[SignalResponse]


class DashboardResponse(BaseModel):
    buildings: list[DashboardBuildingResponse]
    total: int


class BuildingListResponse(BaseModel):
    buildings: list[BuildingResponse]
    total: int
