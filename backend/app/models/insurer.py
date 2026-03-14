from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Insurer(Base):
    __tablename__ = "insurers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    buildings = relationship("Building", back_populates="insurer", cascade="all, delete-orphan")
