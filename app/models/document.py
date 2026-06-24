from sqlalchemy import Column, BigInteger, String, Text, Float, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base_class import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    raw_content = Column(Text, nullable=False)
    difficulty_score = Column(Float, nullable=False, default=0.0)  # Flesch-Kincaid corresponding index
    read_time_expected = Column(Integer, nullable=False, default=0)  # Expected read time in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sessions = relationship("ReadingSession", back_populates="document", cascade="all, delete-orphan")
