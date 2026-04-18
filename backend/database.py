# Copyright 2026 SoulMD Inc. All Rights Reserved.
# Unauthorized copying, modification, distribution or use of this software is strictly prohibited.

from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, JSON, text
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
    stripe_customer_id = Column(String, nullable=True, index=True)
    is_superuser = Column(Boolean, default=False)
    overage_amount_this_month = Column(Float, default=0.0)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    tool_slug = Column(String, index=True)
    tier = Column(String)
    status = Column(String, default="active", index=True)
    stripe_subscription_id = Column(String, unique=True, index=True, nullable=True)
    stripe_price_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, index=True, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ToolUsage(Base):
    __tablename__ = "tool_usage"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    tool_slug = Column(String, index=True)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ClinicalCase(Base):
    __tablename__ = "clinical_cases"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    tool_slug = Column(String, index=True)
    title = Column(String)
    inputs = Column(JSON)
    result = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ToolFeedback(Base):
    __tablename__ = "tool_feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    tool_slug = Column(String, index=True)
    rating = Column(Boolean)
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
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_stripe_customer_id ON users(stripe_customer_id)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS overage_amount_this_month FLOAT DEFAULT 0.0"))

try:
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO subscriptions (user_id, tool_slug, tier, status, created_at, updated_at)
            SELECT id, 'ekgscan', subscription_tier, 'active', NOW(), NOW()
            FROM users
            WHERE is_subscribed = TRUE
              AND subscription_tier IN ('monthly', 'yearly')
              AND NOT EXISTS (
                SELECT 1 FROM subscriptions s WHERE s.user_id = users.id AND s.tool_slug = 'ekgscan'
              )
        """))
except Exception as e:
    print(f"Grandfather migration skipped: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
