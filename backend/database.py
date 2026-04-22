# Copyright 2026 SoulMD, LLC. All Rights Reserved.
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
    # For bundle subscriptions, the specific tool slugs the user chose at
    # checkout. None for non-bundle subs. Example: ["clinicalnote","ekgscan",
    # "nephroai","cerebralai"] for a Clinical Bundle.
    selected_tools = Column(JSON, nullable=True)
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

class DeletedAccount(Base):
    __tablename__ = "deleted_accounts"
    id = Column(Integer, primary_key=True, index=True)
    email_hash = Column(String, unique=True, index=True)
    deleted_at = Column(DateTime, default=datetime.utcnow, index=True)
    reason = Column(String, nullable=True)
    re_registration_attempts = Column(Integer, default=0)

class MagicLinkAttempt(Base):
    __tablename__ = "magic_link_attempts"
    id = Column(Integer, primary_key=True, index=True)
    email_hash = Column(String, index=True)
    ip_hash = Column(String, index=True)
    is_new_account = Column(Boolean, default=False)
    was_blocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ToolFeedback(Base):
    __tablename__ = "tool_feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    tool_slug = Column(String, index=True)
    rating = Column(Boolean, nullable=True)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

# ─── Concierge Medicine (private, anderson@soulmd.us only) ─────────────────
# All concierge_* tables are access-controlled at the API layer by
# verify_concierge_admin (superuser + email match). These are NOT exposed to
# regular SoulMD users under any circumstances.

class ConciergePatient(Base):
    __tablename__ = "concierge_patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    dob = Column(String, nullable=True)  # ISO date string, keeps form simple
    phone = Column(String, nullable=True)
    membership_tier = Column(String, default="awaken")  # awaken | align | ascend
    intake_data = Column(JSON, default=dict)  # chief_complaint, medical_history, medications, allergies, goals, comm_preference, etc.
    doctor_notes = Column(String, default="")  # free-text private notes
    last_contact_at = Column(DateTime, nullable=True)
    # Billing — canonical Stripe pointers live on the patient so we can
    # create subscriptions lazily without a Membership row existing yet.
    stripe_customer_id = Column(String, nullable=True, index=True)
    stripe_subscription_id = Column(String, nullable=True, index=True)
    subscription_status = Column(String, nullable=True)  # active | paused | canceled | past_due | incomplete
    current_period_end = Column(DateTime, nullable=True)
    total_paid_cents = Column(Integer, default=0)  # rolling lifetime total of successful concierge invoices
    # Visit + meditation counters — reset monthly by the UI display logic
    # against current_period_end. Source of truth for "2 of 3 visits used
    # this month" in the patient app.
    user_id = Column(Integer, nullable=True, index=True)  # link to users.id for patient-app role lookup
    visits_used = Column(Integer, default=0)
    meditations_used = Column(Integer, default=0)
    period_counter_reset_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ConciergeMessage(Base):
    __tablename__ = "concierge_messages"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    direction = Column(String)  # "outbound" (physician→patient) | "inbound" (patient→physician) | "note"
    subject = Column(String, nullable=True)
    body = Column(String)
    category = Column(String, default="general")  # medical | lab_review | meditation | billing | oracle | general
    read_at = Column(DateTime, nullable=True)
    # Optional link to another concierge entity the message is "about". Used
    # today only for meditation-prescription messages so the patient's UI
    # can open a dedicated reader instead of rendering the full script
    # inline. Generic so new integrations can reuse it.
    related_id = Column(Integer, nullable=True)
    related_kind = Column(String, nullable=True)  # "meditation" | "lab" | "oracle" | ...
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ConciergeAppointment(Base):
    __tablename__ = "concierge_appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    starts_at = Column(DateTime, index=True)
    duration_min = Column(Integer, default=30)
    appointment_type = Column(String)  # medical_visit | life_coaching | guided_meditation | telehealth | follow_up
    status = Column(String, default="scheduled")  # scheduled | completed | canceled | no_show
    notes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class ConciergeMembership(Base):
    __tablename__ = "concierge_memberships"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    tier = Column(String)  # awaken | align | ascend
    status = Column(String, default="active")
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    canceled_at = Column(DateTime, nullable=True)

class ConciergeInvoice(Base):
    __tablename__ = "concierge_invoices"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    amount_cents = Column(Integer)
    description = Column(String)
    status = Column(String, default="paid")  # paid | pending | failed
    stripe_invoice_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ConciergeCoachingModule(Base):
    __tablename__ = "concierge_coaching_modules"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String, default="")
    content = Column(String, default="")  # markdown-ish prose
    exercises = Column(JSON, default=list)  # [{prompt, type, ...}]
    created_at = Column(DateTime, default=datetime.utcnow)

class ConciergeModuleAssignment(Base):
    __tablename__ = "concierge_module_assignments"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, index=True)
    patient_id = Column(Integer, index=True)
    progress_pct = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

class ConciergeMeditation(Base):
    __tablename__ = "concierge_meditations"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    category = Column(String)  # one of MEDITATION_CATEGORIES or a library slug (e.g. divine_light_healing)
    description = Column(String, default="")
    duration_min = Column(Integer, default=10)
    script = Column(String, default="")  # text
    audio_url = Column(String, nullable=True)
    # Library fields — populated by the Claude-generated 2,000-meditation
    # seed (backend/meditations.json). Stay null for physician-custom
    # meditations entered via the Meditations section UI.
    difficulty = Column(String, nullable=True)      # Beginner | Intermediate | Advanced
    affirmations = Column(JSON, nullable=True)      # list of strings
    tags = Column(JSON, nullable=True)              # list of lowercase tags for physician search
    physician_notes = Column(String, nullable=True) # "when to prescribe this"
    source = Column(String, default="manual")       # "manual" | "library"
    created_at = Column(DateTime, default=datetime.utcnow)

class ConciergeMeditationAssignment(Base):
    __tablename__ = "concierge_meditation_assignments"
    id = Column(Integer, primary_key=True, index=True)
    meditation_id = Column(Integer, index=True)
    patient_id = Column(Integer, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

class ConciergeHabit(Base):
    __tablename__ = "concierge_habits"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    title = Column(String)
    description = Column(String, default="")
    frequency = Column(String, default="daily")  # daily | weekly | custom
    target = Column(String, default="")  # e.g. "5x/week", "10 min/day"
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConciergeHabitCheckin(Base):
    __tablename__ = "concierge_habit_checkins"
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, index=True)
    status = Column(String)  # done | skipped | partial
    notes = Column(String, default="")
    checked_in_at = Column(DateTime, default=datetime.utcnow, index=True)

class ConciergeOraclePull(Base):
    __tablename__ = "concierge_oracle_pulls"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    pull_date = Column(String, index=True, nullable=False)  # YYYY-MM-DD in practice timezone (MST)
    message_id = Column(Integer, nullable=False)
    category = Column(String, nullable=True)
    saved = Column(Boolean, default=False)
    intention = Column(String, nullable=True)       # Ritual step 2: what the patient asked for guidance on
    reflection = Column(String, nullable=True)      # Ritual step 5: their journal entry after sitting with the message
    reflected_at = Column(DateTime, nullable=True)  # Set when reflection is first saved
    created_at = Column(DateTime, default=datetime.utcnow)

class ConciergeLabRecord(Base):
    __tablename__ = "concierge_lab_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending | reviewed | flagged
    flagged = Column(Boolean, default=False)
    physician_note = Column(String, default="")
    # File bytes are stored inline for now (small labs, LOB in Postgres).
    # Swap to S3/R2 when patient volume grows past a few hundred docs.
    file_data = Column(String, nullable=True)  # base64-encoded payload
    uploaded_at = Column(DateTime, default=datetime.utcnow, index=True)
    reviewed_at = Column(DateTime, nullable=True)

class ToolTrialUse(Base):
    __tablename__ = "tool_trial_uses"
    id = Column(Integer, primary_key=True, index=True)
    client_fp = Column(String, index=True, nullable=False)  # sha256 of IP + UA
    tool_slug = Column(String, index=True, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)    # set if an auth'd non-subscriber consumed the trial
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    endpoint = Column(String, unique=True, nullable=False)  # browser's push endpoint URL
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_delivery_at = Column(DateTime, nullable=True)

class UserStyleProfile(Base):
    __tablename__ = "user_style_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    profile_text = Column(String, nullable=False)
    sample_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

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
    conn.execute(text("ALTER TABLE tool_feedback ADD COLUMN IF NOT EXISTS comment VARCHAR"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS overage_amount_this_month FLOAT DEFAULT 0.0"))
    # Concierge patient billing columns — added for Billing section. Safe no-op
    # if the concierge_patients table doesn't exist yet (table-less ALTER
    # errors are caught by the outer try below).
    try:
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS subscription_status VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS total_paid_cents INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS user_id INTEGER"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS visits_used INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS meditations_used INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS period_counter_reset_at TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_stripe_customer_id ON concierge_patients(stripe_customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_stripe_subscription_id ON concierge_patients(stripe_subscription_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_user_id ON concierge_patients(user_id)"))
        conn.execute(text("ALTER TABLE concierge_messages ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'general'"))
        conn.execute(text("ALTER TABLE concierge_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_oracle_pulls ADD COLUMN IF NOT EXISTS intention VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_oracle_pulls ADD COLUMN IF NOT EXISTS reflection VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_oracle_pulls ADD COLUMN IF NOT EXISTS reflected_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS selected_tools JSON"))
        conn.execute(text("ALTER TABLE concierge_messages ADD COLUMN IF NOT EXISTS related_id INTEGER"))
        conn.execute(text("ALTER TABLE concierge_messages ADD COLUMN IF NOT EXISTS related_kind VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_meditations ADD COLUMN IF NOT EXISTS difficulty VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_meditations ADD COLUMN IF NOT EXISTS affirmations JSON"))
        conn.execute(text("ALTER TABLE concierge_meditations ADD COLUMN IF NOT EXISTS tags JSON"))
        conn.execute(text("ALTER TABLE concierge_meditations ADD COLUMN IF NOT EXISTS physician_notes VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_meditations ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'manual'"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_meditations_source   ON concierge_meditations(source)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_meditations_category ON concierge_meditations(category)"))
    except Exception as e:
        print(f"Concierge billing column migration skipped: {e}")

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
