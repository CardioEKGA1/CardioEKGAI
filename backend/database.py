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
    # Legacy: populated by the removed bundle checkout flow with the tool
    # slugs the user picked at checkout. Retained nullable so any still-
    # active historical bundle subscriptions keep covering the right tools
    # until they naturally lapse. New subs never write to this column.
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
    # Flag for superuser-owned test rows — excluded from physician dashboard
    # aggregates and billing so the practice owner can exercise the full
    # patient PWA without polluting real panel metrics.
    test_account = Column(Boolean, default=False, index=True)
    # Patient onboarding checkpoints. Both null on a freshly-provisioned row;
    # set to a timestamp when the patient accepts the Terms step and
    # completes the intake form at /patient/{terms,intake}.
    terms_accepted_at = Column(DateTime, nullable=True)
    intake_completed_at = Column(DateTime, nullable=True)
    # Physician-approval gate: a patient row may exist (created by the owner
    # via /concierge/patients OR provisioned from a /patient sign-in
    # request) but the patient cannot receive a magic link or reach the
    # patient PWA until is_approved=True. Approval also stamps approved_at
    # and triggers the welcome magic-link email.
    is_approved = Column(Boolean, default=False, index=True)
    approved_at = Column(DateTime, nullable=True)
    # 6-step onboarding gate (consents + intake form). Stamped when the
    # patient completes the final welcome step. PatientApp shows the
    # onboarding overlay until this is set; afterwards the regular tabs
    # become reachable.
    onboarding_completed_at = Column(DateTime, nullable=True)
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
    # Zoom for Healthcare integration (populated when a session_request is
    # confirmed). join_url is patient-facing; start_url is physician-only.
    zoom_meeting_id = Column(String, nullable=True, index=True)
    zoom_join_url   = Column(String, nullable=True)
    zoom_start_url  = Column(String, nullable=True)
    # Back-link to the originating session request (when this appointment
    # was provisioned via the patient request flow).
    session_request_id = Column(Integer, nullable=True, index=True)
    # Cancellation accounting — the 48h policy is enforced at request time
    # but persisted here so the physician dashboard can audit.
    canceled_at = Column(DateTime, nullable=True)
    canceled_within_window = Column(Boolean, default=False)  # < 48h cancellation forfeits credit
    completed_at = Column(DateTime, nullable=True)
    no_showed_at = Column(DateTime, nullable=True)
    physician_session_notes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

# Patient consent records — one row per (patient × document_type × version).
# Re-signing a new version creates a new row so the historical signature is
# never overwritten. document_type slugs match the 4 onboarding consent
# steps: telehealth_consent, good_faith_estimate, communication_policy,
# cancellation_policy.
class ConciergePatientConsent(Base):
    __tablename__ = "concierge_patient_consents"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    document_type = Column(String, index=True, nullable=False)
    document_version = Column(String, default="1.0")
    signed_name = Column(String, nullable=False)
    signed_at = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)


# Structured intake form (separate from the legacy intake_data JSON on
# ConciergePatient). Latest row per patient_id wins; older submissions are
# kept for audit. The "personal" fields are duplicated from ConciergePatient
# so the form is self-contained for the physician's review.
class ConciergePatientIntake(Base):
    __tablename__ = "concierge_patient_intake"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    # Personal
    full_name = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    # Medical
    medical_conditions = Column(JSON, default=list)  # checklist (list of strings)
    surgeries = Column(String, default="")
    medications = Column(String, default="")
    allergies = Column(String, default="")
    family_history = Column(String, default="")
    # Lifestyle
    exercise = Column(String, default="")
    diet = Column(String, default="")
    sleep = Column(String, default="")
    stress = Column(String, default="")
    substance_use = Column(String, default="")
    # Spiritual / integrative
    spiritual_practice = Column(String, default="")
    healing_goals = Column(String, default="")
    # Audit
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String, nullable=True)


# Catalog of bookable session types. Seeded at boot if empty. tier_required
# is the minimum membership tier that can request the session ('ascend' for
# urgent same-day; null for everyone). is_async marks lab review where
# scheduling doesn't apply.
class ConciergeSessionType(Base):
    __tablename__ = "concierge_session_types"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=30)
    tier_required = Column(String, nullable=True)  # null | 'ascend'
    is_async = Column(Boolean, default=False)
    sort_order = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)


# Patient-initiated session request. Physician sees this as a card with the
# patient's three preferred times + note. On confirm, a ConciergeAppointment
# row is provisioned (with Zoom URLs) and `confirmed_appointment_id` is set.
class ConciergeSessionRequest(Base):
    __tablename__ = "concierge_session_requests"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    session_type_id = Column(Integer, index=True, nullable=False)
    preferred_times = Column(JSON, default=list)  # list of up to 3 ISO datetime strings
    patient_note = Column(String, default="")
    # pending → confirmed | counter_proposed | declined | cancelled
    status = Column(String, default="pending", index=True)
    physician_response_note = Column(String, default="")
    counter_proposed_time = Column(DateTime, nullable=True)
    confirmed_appointment_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


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

class ConciergeEnergyLog(Base):
    __tablename__ = "concierge_energy_logs"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    log_date = Column(String, index=True, nullable=False)  # YYYY-MM-DD MST
    energy_score = Column(Integer, nullable=False)         # 1=Struggling … 5=Thriving
    note = Column(String, default="")
    session_id = Column(Integer, nullable=True, index=True)  # FK → concierge_meditations.id when entry was logged after a meditation
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ConciergeJournalEntry(Base):
    __tablename__ = "concierge_journal_entries"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    meditation_id = Column(Integer, nullable=True, index=True)
    entry_date = Column(String, index=True, nullable=False)  # YYYY-MM-DD MST
    mood_shift = Column(String, nullable=True)   # Q1: much_better | a_little_better | same | processing
    reflection = Column(String, default="")      # Q2
    intention = Column(String, default="")       # Q3
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class PageVisit(Base):
    __tablename__ = "page_visits"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, index=True)
    page = Column(String, index=True)         # e.g. "/", "/dashboard", "/scan"
    user_agent = Column(String, nullable=True)
    referrer = Column(String, nullable=True)
    country = Column(String, nullable=True)   # ip-api.com lookup, "Unknown" on failure
    region = Column(String, nullable=True)    # ip-api.com regionName
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

# ─── /meditate standalone app ───────────────────────────────────────────
# Separate surface from the concierge PWA. Three tables: a Yogananda
# message bank, the daily-pull ledger (also stores the per-day
# reflection inline), and a richer post-meditation diary.

class MeditateOracleMessage(Base):
    __tablename__ = "meditate_oracle_messages"
    id = Column(Integer, primary_key=True, index=True)
    message_text = Column(String, nullable=False)
    source_tag = Column(String, default="yogananda", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MeditateOraclePull(Base):
    __tablename__ = "meditate_oracle_pulls"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    pull_date = Column(String, index=True, nullable=False)  # YYYY-MM-DD MST
    message_id = Column(Integer, nullable=False)
    flower_index = Column(Integer, nullable=False)          # 0-9 sprite index
    reflection = Column(String, default="")                 # patient's response to the prompt
    reflected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class MeditateDiaryEntry(Base):
    __tablename__ = "meditate_diary_entries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    meditation_id = Column(Integer, nullable=True, index=True)  # nullable — standalone entries allowed
    meditation_title = Column(String, default="")               # snapshot at write time
    body_sensations = Column(String, default="")
    emotions_felt = Column(String, default="")
    visions_or_insights = Column(String, default="")
    general_reflection = Column(String, default="")
    mood_before = Column(Integer, nullable=True)                # 1-5
    mood_after = Column(Integer, nullable=True)                 # 1-5
    # 3 optional gratitude lines saved per entry. Pre-existing rows
    # back-fill as NULL via the boot-time ALTER TABLE migration.
    gratitude_1 = Column(String, nullable=True)
    gratitude_2 = Column(String, nullable=True)
    gratitude_3 = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ─── /meditate engagement layer ───────────────────────────────────────
# Tracks intentions, favorites, play history, and AI insights so the
# home screen can show streaks + resume + personal monthly observations.
# All keyed by users.id (the PWA always operates against the signed-in
# user, never directly off concierge_patients).

class MeditateIntention(Base):
    __tablename__ = "meditate_intentions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    intention_text = Column(String, nullable=False)
    date = Column(String, index=True, nullable=False)  # YYYY-MM-DD MST — one row per user/day
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class MeditateOracleFavorite(Base):
    __tablename__ = "meditate_oracle_favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    oracle_pull_id = Column(Integer, index=True, nullable=False)  # meditate_oracle_pulls.id
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class MeditateMedFavorite(Base):
    __tablename__ = "meditate_med_favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    meditation_id = Column(Integer, index=True, nullable=False)   # concierge_meditations.id
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class MeditatePlayHistory(Base):
    __tablename__ = "meditate_play_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    meditation_id = Column(Integer, index=True, nullable=False)
    played_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed = Column(Boolean, default=False, index=True)        # set True when Mark Complete fires

class MeditateAiInsight(Base):
    __tablename__ = "meditate_ai_insights"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    insight_text = Column(String, nullable=False)
    month = Column(String, index=True, nullable=False)  # YYYY-MM — one row per user/month
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

# Public landing-page submissions. Both tables are written from
# unauthenticated POSTs (no token required) so the marketing pages
# don't sit behind a login wall. Status field is just a manual queue
# Dr. Anderson can update through the admin console / Postgres later;
# default 'pending'.

class MeditateAccessRequest(Base):
    __tablename__ = "meditate_access_requests"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    reason = Column(String, default="")
    status = Column(String, default="pending", index=True)  # pending | invited | declined
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ConciergeInquiry(Base):
    __tablename__ = "concierge_inquiries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    phone = Column(String, nullable=True)
    tier_interest = Column(String, nullable=True)  # awaken | align | ascend | unsure
    # message is the legacy free-text column kept for back-compat with
    # historical inquiries. New submissions write to health_history.
    message = Column(String, default="")
    # Richer intake added with the flippable tier-card request form:
    dob = Column(String, nullable=True)                       # ISO date string
    health_history = Column(String, default="")               # primary narrative field
    heard_from = Column(String, nullable=True)                # social/referral/etc.
    insurance_acknowledged = Column(Boolean, default=False)   # required checkbox
    status = Column(String, default="pending", index=True)  # pending | responded | enrolled | declined
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

# HIPAA-style audit trail. Records every action a physician (or admin)
# takes against a patient record so we can demonstrate access provenance
# during compliance review. Append-only; never updated. The detail JSON
# carries action-specific context (e.g. window range for a draft review).
class HipaaAuditLog(Base):
    __tablename__ = "hipaa_audit_log"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)        # the actor (Dr. Anderson, etc.)
    action = Column(String, index=True, nullable=False)          # DRAFT_MONTHLY_REVIEW, VIEW_LAB, etc.
    resource_type = Column(String, index=True, nullable=False)   # patient_record | lab | message | ...
    resource_id = Column(Integer, index=True, nullable=True)
    detail = Column(JSON, nullable=True)                         # arbitrary action-specific context
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
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
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS test_account BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMP"))
        # Physician-approval gate. Existing rows default to FALSE; the
        # owner approves new patients from the dashboard Members tab.
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_is_approved ON concierge_patients(is_approved)"))
        # 6-step onboarding completion + appointment Zoom + cancellation
        # accounting columns. Safe ADD COLUMN IF NOT EXISTS — Postgres-only.
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS zoom_meeting_id VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS zoom_join_url VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS zoom_start_url VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS session_request_id INTEGER"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS canceled_within_window BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS no_showed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS physician_session_notes VARCHAR DEFAULT ''"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_appointments_zoom_meeting_id ON concierge_appointments(zoom_meeting_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_appointments_session_request_id ON concierge_appointments(session_request_id)"))
        # Pre-approve the test patient so dev sign-in continues to work
        # uninterrupted. Idempotent — only stamps approved_at if NULL.
        conn.execute(text(
            "UPDATE concierge_patients "
            "SET is_approved = TRUE, approved_at = COALESCE(approved_at, NOW()) "
            "WHERE LOWER(email) = 'spicymolecule@gmail.com'"
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_test_account ON concierge_patients(test_account)"))
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
        # Gratitude lines added on the meditate diary entry. Pre-existing
        # rows back-fill as NULL (the form treats blank as "skipped").
        conn.execute(text("ALTER TABLE meditate_diary_entries ADD COLUMN IF NOT EXISTS gratitude_1 VARCHAR"))
        conn.execute(text("ALTER TABLE meditate_diary_entries ADD COLUMN IF NOT EXISTS gratitude_2 VARCHAR"))
        conn.execute(text("ALTER TABLE meditate_diary_entries ADD COLUMN IF NOT EXISTS gratitude_3 VARCHAR"))
        # Richer concierge inquiry intake (flippable tier-card form).
        conn.execute(text("ALTER TABLE concierge_inquiries ADD COLUMN IF NOT EXISTS dob VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_inquiries ADD COLUMN IF NOT EXISTS health_history VARCHAR DEFAULT ''"))
        conn.execute(text("ALTER TABLE concierge_inquiries ADD COLUMN IF NOT EXISTS heard_from VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_inquiries ADD COLUMN IF NOT EXISTS insurance_acknowledged BOOLEAN DEFAULT FALSE"))
    except Exception as e:
        print(f"Concierge billing column migration skipped: {e}")

# Seed the bookable session-type catalog if empty. Idempotent: each row is
# upserted by slug. Source of truth for the patient Book tab dropdown and
# physician Appointments confirmation modal.
try:
    from sqlalchemy.orm import Session as _Sess
    _seed_db = _Sess(bind=engine)
    if _seed_db.query(ConciergeSessionType).count() == 0:
        seeds = [
            ("energy_healing",   "Energy Healing / Life Coaching", 30, None,     False, 10),
            ("medical_consult",  "Medical Consultation",            30, None,     False, 20),
            ("extended_visit",   "Extended Visit",                  60, None,     False, 30),
            ("guided_meditation","Guided Meditation",               30, None,     False, 40),
            ("urgent_same_day",  "Urgent Same-Day Consult",         30, "ascend", False, 50),
            ("lab_review",       "Lab Result Review (async)",       0,  None,     True,  60),
        ]
        for slug, name, dur, tier, is_async, sort in seeds:
            _seed_db.add(ConciergeSessionType(
                slug=slug, name=name, duration_minutes=dur,
                tier_required=tier, is_async=is_async, sort_order=sort,
            ))
        _seed_db.commit()
        print(f"Seeded {len(seeds)} concierge session types.")
    _seed_db.close()
except Exception as e:
    print(f"Session type seed skipped: {e}")

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

# Auto-seed the meditate_oracle_messages table on first boot. Idempotent —
# returns 0 if rows already exist, so it's safe to run on every restart.
# A standalone runner exists at scripts/seed_yogananda_messages.py for
# manual / forced re-seeding.
try:
    import os as _os
    _os.makedirs(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "scripts"), exist_ok=True)
    from scripts.seed_yogananda_messages import seed_into_session as _seed_yog  # type: ignore
    _s = SessionLocal()
    try:
        _n = _seed_yog(_s, force=False)
        _s.commit()
        if _n > 0:
            print(f"Seeded {_n} Yogananda messages into meditate_oracle_messages.")
    finally:
        _s.close()
except Exception as e:  # never let seed failure block boot
    print(f"Yogananda seed skipped: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
