from sqlalchemy import Column, BigInteger, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base_class import Base

class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey("reading_sessions.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, nullable=False)
    user_answer = Column(String(255), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ReadingSession", back_populates="quiz_results")
