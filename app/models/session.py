from sqlalchemy import Column, String, BigInteger, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base_class import Base

class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id = Column(String(50), primary_key=True)  # Format: "sess_<uuid>"
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(BigInteger, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    final_progress = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")
    document = relationship("Document", back_populates="sessions")
    behavior_logs = relationship("BehaviorLog", back_populates="session", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="session", cascade="all, delete-orphan")
    score = relationship("LiteracyScore", back_populates="session", uselist=False, cascade="all, delete-orphan")
