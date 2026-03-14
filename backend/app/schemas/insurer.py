from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InsurerCreate(BaseModel):
    name: str


class InsurerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
