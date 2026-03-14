import enum

from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SignalType(str, enum.Enum):
    CV_CLASSIFICATION = "cv_classification"
    CV_CLASSIFICATION_CHANGE = "cv_classification_change"
    SIC_MISMATCH = "sic_mismatch"
    LICENSING = "licensing"
    KEYWORD_HIT = "keyword_hit"
    FOOD_HYGIENE_POOR = "food_hygiene_poor"
    FOOD_HYGIENE_ACCEPTABLE = "food_hygiene_acceptable"
    REVIEW_NEGATIVE_TREND = "review_negative_trend"
    REVIEW_CLOSURE_MENTIONS = "review_closure_mentions"
    CRIME_COMMERCIAL_HIGH = "crime_commercial_high"
    CRIME_COMMERCIAL_MEDIUM = "crime_commercial_medium"


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("snapshots.id"), index=True)

    # Core fields
    signal_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(String(500))
    weight: Mapped[float] = mapped_column(Float, default=0.0)

    # Confidence scoring (NEW)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    confidence_source_reliability: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_data_freshness: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_corroboration: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Source tracking (NEW)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Raw data
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    snapshot = relationship("Snapshot", back_populates="evidence_items")
