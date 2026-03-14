from datetime import datetime

from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), index=True)
    run_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Agent data (existing)
    geocode_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    companies_house_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    places_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    street_view_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    licensing_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # NEW: Additional agent data
    food_hygiene_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    crime_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    review_sentiment_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Risk scoring (existing + NEW confidence)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_tier: Mapped[str] = mapped_column(String(20), default="low")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)  # NEW

    building = relationship("Building", back_populates="snapshots")
    evidence_items = relationship(
        "EvidenceItem", back_populates="snapshot", cascade="all, delete-orphan"
    )
