from sqlalchemy import Column, Integer, BigInteger, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    username = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sessions = relationship("ReadingSession", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("LiteracyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
