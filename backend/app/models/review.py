import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReviewAction(str, enum.Enum):
    CLEARED = "cleared"
    ESCALATED = "escalated"
    NOTED = "noted"


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), index=True)
    reviewer_name: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    building = relationship("Building", back_populates="reviews")
