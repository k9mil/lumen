import enum
from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BuildingStatus(str, enum.Enum):
    ACTIVE = "active"
    NEEDS_REVIEW = "needs_review"
    REVIEWED = "reviewed"
    ESCALATED = "escalated"
    CLEARED = "cleared"
    MONITORING = "monitoring"


class RiskTier(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Building(Base):
    __tablename__ = "buildings"
    __table_args__ = (
        Index("ix_buildings_insurer_id", "insurer_id"),
        Index("ix_buildings_status", "status"),
        Index("ix_buildings_risk_tier", "risk_tier"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    insurer_id: Mapped[int] = mapped_column(ForeignKey("insurers.id"), index=False)
    address: Mapped[str] = mapped_column(String(500))
    property_class: Mapped[str] = mapped_column(String(100), default="")
    place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=BuildingStatus.ACTIVE.value)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_tier: Mapped[str] = mapped_column(String(20), default=RiskTier.LOW.value)
    tenant: Mapped[str | None] = mapped_column(String(255), nullable=True)
    registered_use: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detected_use: Mapped[str | None] = mapped_column(String(255), nullable=True)
    use_mismatch: Mapped[bool] = mapped_column(Boolean, default=False)
    listed: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    property_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    insurer = relationship("Insurer", back_populates="buildings")
    snapshots = relationship("Snapshot", back_populates="building", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="building", cascade="all, delete-orphan")
