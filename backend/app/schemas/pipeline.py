"""Pipeline API schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PipelineRunRequest(BaseModel):
    """Request to run pipeline."""

    force: bool = False
    """Force run even if recently processed."""

    async_run: bool = False
    """Run in background and return immediately."""

    concurrency: int = 3
    """Max concurrent pipelines (for batch runs)."""


class PipelineRunResponse(BaseModel):
    """Response from pipeline run request."""

    building_id: int
    status: str
    message: str
    snapshot_id: int | None = None
    risk_score: int | None = None
    risk_tier: str | None = None


class PipelineStatusResponse(BaseModel):
    """Current pipeline status for a building."""

    building_id: int
    address: str
    current_status: str
    current_score: int
    current_tier: str
    last_run: datetime | None
    total_snapshots: int
    needs_review: bool


class EvidenceItemSchema(BaseModel):
    """Single evidence item."""

    id: int
    signal_type: str
    description: str
    weight: float
    raw_data: dict[str, Any] | None


class BuildingEvidenceResponse(BaseModel):
    """Evidence items for a building."""

    building_id: int
    snapshot_id: int | None
    evidence_count: int
    evidence: list[EvidenceItemSchema]


class SnapshotSummarySchema(BaseModel):
    """Summary of a snapshot."""

    id: int
    run_at: datetime
    risk_score: int
    risk_tier: str
    has_vision: bool
    has_companies: bool


class BuildingSnapshotsResponse(BaseModel):
    """Snapshot history for a building."""

    building_id: int
    snapshot_count: int
    snapshots: list[SnapshotSummarySchema]
