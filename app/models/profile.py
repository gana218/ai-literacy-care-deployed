from sqlalchemy import Column, BigInteger, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base_class import Base

class LiteracyScore(Base):
    __tablename__ = "literacy_scores"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey("reading_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    comprehension_score = Column(Float, nullable=False)
    engagement_score = Column(Float, nullable=False)
    literacy_score = Column(Float, nullable=False)
    difficulty_weight = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ReadingSession", back_populates="score")


class LiteracyProfile(Base):
    __tablename__ = "literacy_profiles"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    accum_sessions_count = Column(Integer, default=0, nullable=False)
    current_level = Column(Integer, default=1, nullable=False)
    total_xp = Column(Integer, default=0, nullable=False)
    weak_areas = Column(JSONB, default=dict, nullable=False)  # JSON dictionary storing weak areas details
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")
