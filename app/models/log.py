from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base_class import Base

class BehaviorLog(Base):
    __tablename__ = "behavior_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey("reading_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # SCROLL, PARAGRAPH_STAY, TAB_FOCUS, CLICK, PROGRESS
    payload = Column(JSONB, nullable=False)          # Event-specific detail data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ReadingSession", back_populates="behavior_logs")
