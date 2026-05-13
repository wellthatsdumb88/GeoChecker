from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.storage.database import Base


class AuditRecord(Base):
    __tablename__ = "audit_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target_url: Mapped[str] = mapped_column(String(2048), index=True)
    page_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    retrieval_probability: Mapped[float] = mapped_column(Float)
    semantic_similarity: Mapped[float] = mapped_column(Float)
    gas: Mapped[float] = mapped_column(Float)
    payload_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
