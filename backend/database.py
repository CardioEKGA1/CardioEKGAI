from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ekgscan.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    scan_count = Column(Integer, default=0)
    is_subscribed = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    subscription_tier = Column(String, default="free")
    monthly_spend = Column(Float, default=0.0)
    spend_reset_month = Column(Integer, default=0)
    is_clinician = Column(Boolean, default=False)
    clinician_attested_at = Column(DateTime, nullable=True)
    note_style_preference = Column(String, default="standard")
    created_at = Column(DateTime, default=datetime.utcnow)

class ToolUsage(Base):
    __tablename__ = "tool_usage"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    tool_slug = Column(String, index=True)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

Base.metadata.create_all(bind=engine)

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR DEFAULT 'free'"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_spend FLOAT DEFAULT 0.0"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS spend_reset_month INTEGER DEFAULT 0"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_clinician BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS clinician_attested_at TIMESTAMP"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS note_style_preference VARCHAR DEFAULT 'standard'"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
