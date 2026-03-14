from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.snapshot import SnapshotResponse


class EvidenceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snapshot_id: int
    signal_type: str
    description: str
    weight: float
    raw_data: dict[str, Any] | None = None


class DiffItem(BaseModel):
    field: str
    old: Any = None
    new: Any = None
    severity: str = "info"


class EvidenceResponse(BaseModel):
    snapshot: SnapshotResponse
    evidence_items: list[EvidenceItemResponse]
    diff: list[DiffItem] | None = None
