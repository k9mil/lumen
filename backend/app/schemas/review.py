from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReviewCreate(BaseModel):
    reviewer_name: str
    action: str  # cleared, escalated, noted
    notes: str | None = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    building_id: int
    reviewer_name: str
    action: str
    notes: str | None = None
    created_at: datetime
