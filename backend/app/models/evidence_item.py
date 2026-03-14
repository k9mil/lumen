import enum

from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SignalType(str, enum.Enum):
    CV_CLASSIFICATION = "cv_classification"
    SIC_MISMATCH = "sic_mismatch"
    LICENSING = "licensing"
    KEYWORD_HIT = "keyword_hit"


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("snapshots.id"), index=True)
    signal_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(String(500))
    weight: Mapped[float] = mapped_column(Float, default=0.0)
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    snapshot = relationship("Snapshot", back_populates="evidence_items")
