# Copyright 2026 SoulMD, LLC. All Rights Reserved.
# Unauthorized copying, modification, distribution or use of this software is strictly prohibited.

from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, JSON, Enum as SAEnum, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum
import os


# ─── Membership lifecycle states ──────────────────────────────────────
# Drives the 3-month-trial-to-annual policy. Values are deliberately
# verb-noun_role so log lines and dashboards read naturally. Stored on
# concierge_patients.membership_status as a Postgres ENUM so an invalid
# string can never be persisted.
class MembershipStatus(str, enum.Enum):
    ACTIVE_MONTHLY        = "active_monthly"          # in months 1–3 of the trial
    BALANCE_INVOICE_SENT  = "balance_invoice_sent"    # 3rd payment cleared, balance invoice emailed
    GRACE_PERIOD          = "grace_period"            # within the 14-day grace before downgrade
    ACTIVE_ANNUAL         = "active_annual"           # paid the balance OR renewed annually
    RENEWAL_INVOICE_SENT  = "renewal_invoice_sent"    # year 2+: 30-day renewal window opened
    RENEWAL_GRACE_PERIOD  = "renewal_grace_period"    # year 2+: in 14-day post-due grace
    DOWNGRADED_ALACARTE   = "downgraded_alacarte"     # portal-only, à la carte rates apply

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
    # Provenance of the patient's enrollment payment. 'stripe' is the
    # standard path (inquiry → checkout → webhook). 'manual' is a comp /
    # internal account (e.g. Dr. Anderson testing on her own personal
    # email) provisioned via /concierge/admin/provision-comp-patient,
    # bypassing Stripe entirely. Distinct from test_account: a manual
    # patient can still be a real production user; we just billed them
    # outside the system.
    payment_method = Column(String, default="stripe", index=True)
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
    # 18+ verification — required by the SoulMD Concierge ToS. Patient
    # checks the box during onboarding (and on the public tier-card
    # form before submitting). Until this flips True the backend
    # refuses to mark intake_completed_at, so the onboarding gate
    # cannot be cleared. Mirrored as the canonical patient-level flag
    # alongside the per-intake-row flag on ConciergePatientIntake.
    age_verified = Column(Boolean, default=False, index=True)
    # ─── 3-month trial → annual commitment policy ────────────────────
    # Year-1 membership runs as 3 monthly invoices, then a one-time
    # remaining-balance invoice (annual − 3×monthly) with a 14-day
    # grace window. Year-2+ renewals require the full annual payment.
    # All non-NULL columns below participate in the lifecycle cron
    # sweep at /internal/jobs/membership-lifecycle.
    monthly_payment_count        = Column(Integer, default=0, index=True)  # incremented on each successful monthly invoice
    trial_end_date               = Column(DateTime, nullable=True)         # joined_at + 90 days; informational
    remaining_balance_invoice_sent_at = Column(DateTime, nullable=True)
    remaining_balance_due_at     = Column(DateTime, nullable=True)         # invoice_sent_at + 14d
    annual_start_date            = Column(DateTime, nullable=True)         # set when remaining-balance invoice clears
    annual_renewal_due_at        = Column(DateTime, nullable=True)         # annual_start_date + 365d
    renewal_invoice_sent_at      = Column(DateTime, nullable=True)
    grace_period_end             = Column(DateTime, nullable=True)         # repurposed across both balance + renewal grace
    downgraded_at                = Column(DateTime, nullable=True)
    is_first_year                = Column(Boolean, default=True, index=True)
    membership_status            = Column(
        SAEnum(MembershipStatus, name="membership_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=MembershipStatus.ACTIVE_MONTHLY,
        nullable=False,
        index=True,
    )
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
    # Reminder cron idempotency stamps. NULL = not yet sent for that window.
    reminder_24h_sent_at = Column(DateTime, nullable=True)
    reminder_1h_sent_at = Column(DateTime, nullable=True)
    reminder_followup_sent_at = Column(DateTime, nullable=True)
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
    # Age verification — patient must be 18+ to enroll. The intake
    # form requires the checkbox AND a DOB; the backend re-validates
    # both before stamping age_verified_at and propagating
    # ConciergePatient.age_verified.
    date_of_birth = Column(String, nullable=True)              # ISO date string, mirrors `dob` for explicitness
    age_verified = Column(Boolean, default=False)
    age_verified_at = Column(DateTime, nullable=True)
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
    """Source of truth for "Dr. Anderson prescribed meditation X to
    patient Y". The patient meditations tab reads from here ONLY —
    nobody but the physician can write to this table. Per spec the
    patient never browses the library directly; they only see what's
    been assigned to them."""
    __tablename__ = "concierge_meditation_assignments"
    id = Column(Integer, primary_key=True, index=True)
    meditation_id = Column(Integer, index=True, nullable=False)
    patient_id = Column(Integer, index=True, nullable=False)
    physician_id = Column(Integer, index=True, nullable=True)   # users.id of the prescribing physician
    physician_note = Column(String, default="")                 # personal note shown on the patient card
    frequency = Column(String, default="one_time", index=True)  # one_time | daily | custom
    next_send_at = Column(DateTime, nullable=True, index=True)  # for daily / custom auto-rotation cron (future)
    played_at = Column(DateTime, nullable=True)                 # first time the patient opened the script
    completed_at = Column(DateTime, nullable=True)              # patient marked complete
    is_completed = Column(Boolean, default=False, index=True)
    notification_sent = Column(Boolean, default=False)          # in-portal/email sent on prescribe
    assigned_at = Column(DateTime, default=datetime.utcnow, index=True)

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
    insurance_acknowledged = Column(Boolean, default=False)   # required checkbox
    status = Column(String, default="pending", index=True)  # pending | responded | enrolled | declined
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# Public-form abuse log. Every POST to /concierge-medicine/inquire is
# logged here regardless of outcome — accepted, age-rejected, rate-
# limited, honeypot-tripped — so we have a single audit trail for
# Dr. Anderson and so the rate limiter has a clean source of truth.
class ConciergeInquiryLog(Base):
    __tablename__ = "concierge_inquiry_logs"
    id = Column(Integer, primary_key=True, index=True)
    email_hash = Column(String, index=True, nullable=True)   # sha256 of normalized email; nullable in case parsing fails
    ip_address = Column(String, index=True, nullable=True)
    user_agent = Column(String, nullable=True)
    outcome = Column(String, index=True, nullable=False)     # accepted | age_rejected | honeypot | rate_limited | invalid_email | invalid_field
    detail = Column(String, default="")                       # short reason or field name; never raw user input
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# One-time-use guard for magic-link tokens. JWTs are stateless; this
# table records the token's signature when it's first consumed so
# subsequent /auth/verify-token calls with the same token return 401.
# The body is the JWT's signature segment (last "." chunk) to keep the
# index small — collision-resistant under HS256.
class MagicLinkConsumed(Base):
    __tablename__ = "magic_link_consumed"
    id = Column(Integer, primary_key=True, index=True)
    token_sig = Column(String, index=True, unique=True, nullable=False)
    email = Column(String, index=True, nullable=True)
    consumed_ip = Column(String, nullable=True)
    consumed_ua = Column(String, nullable=True)
    consumed_at = Column(DateTime, default=datetime.utcnow, index=True)

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


# ─── ScheduleMD: hospital shift scheduling platform ───────────────────
# Three-hospital roster (IMED, AV, LDS) with day/swing/night/app/backup/
# admin shift types. v2 introduces blocks (multi-month scheduling
# periods), an authenticated provider portal (magic-link tokens), shift
# preferences, time-off requests, swap workflows with a rules engine,
# and per-provider equity tracking. Date columns are stored as
# "YYYY-MM-DD" strings (lexicographic sort matches chronological order)
# for SQLite/Postgres parity. JSON arrays stand in for Postgres TEXT[]
# for the same reason. Admin endpoints are owner-gated; portal
# endpoints are gated by the provider's magic_link_token.
#
# The legacy shiftmd_* tables from v1 are deliberately left intact in
# the database — orphaned, but cheap to keep so existing deploys don't
# need a manual migration. The new schedulemd_* tables seed fresh.
class ScheduleMDHospital(Base):
    __tablename__ = "schedulemd_hospitals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)   # IMED, AV, LDS
    color = Column(String, nullable=False)                           # hex (#RRGGBB)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScheduleMDShift(Base):
    __tablename__ = "schedulemd_shifts"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, index=True, nullable=False)        # FK schedulemd_hospitals.id
    name = Column(String, nullable=False)
    shift_type = Column(String, nullable=False, index=True)          # day|swing|night|app|backup|admin
    start_time = Column(String, nullable=False)                      # "HH:MM" 24-hour
    end_time = Column(String, nullable=False)                        # "HH:MM" — midnight = "00:00"
    sort_order = Column(Integer, default=0, index=True)

class ScheduleMDBlock(Base):
    __tablename__ = "schedulemd_blocks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)                            # "Block 1 — Jan–Jun 2026"
    start_date = Column(String, nullable=False)                      # "YYYY-MM-DD"
    end_date = Column(String, nullable=False)
    status = Column(String, default="draft", index=True)             # draft|preference_open|published
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScheduleMDProvider(Base):
    __tablename__ = "schedulemd_providers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)   # LastnameInitials e.g. "AndersonNE"
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True, index=True)
    role = Column(String, nullable=False)                            # MD|DO|APP|NP|PA
    employment_type = Column(String, nullable=True)                  # fte|part_time|moonlighter|locum
    hospitals = Column(JSON, default=list)                           # ["IMED","AV"]
    no_nights = Column(Boolean, default=False)
    contracted_shifts_per_block = Column(Integer, nullable=True)     # null for locums/moonlighters
    min_shifts_per_block = Column(Integer, nullable=True)
    max_shifts_per_block = Column(Integer, nullable=True)
    magic_link_token = Column(String, nullable=True, index=True)
    magic_link_expires_at = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScheduleMDPreference(Base):
    __tablename__ = "schedulemd_preferences"
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, index=True, nullable=False)        # FK schedulemd_providers.id
    block_id = Column(Integer, index=True, nullable=False)           # FK schedulemd_blocks.id
    preferred_days = Column(JSON, default=list)                      # ["Monday","Tuesday",...]
    preferred_shift_types = Column(JSON, default=list)               # ["day","swing"]
    preferred_hospitals = Column(JSON, default=list)
    avoid_hospitals = Column(JSON, default=list)
    submitted_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleMDTimeOff(Base):
    __tablename__ = "schedulemd_time_off"
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, index=True, nullable=False)
    block_id = Column(Integer, index=True, nullable=True)            # nullable so requests can span blocks
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    reason = Column(String, nullable=True)                           # vacation|cme|personal|other
    note = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)           # pending|approved|denied
    requested_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

class ScheduleMDAssignment(Base):
    __tablename__ = "schedulemd_assignments"
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, index=True, nullable=False)           # FK schedulemd_shifts.id
    block_id = Column(Integer, index=True, nullable=True)            # FK schedulemd_blocks.id (nullable for ad-hoc)
    schedule_date = Column(String, index=True, nullable=False)       # "YYYY-MM-DD"
    provider_id = Column(Integer, index=True, nullable=True)         # null = open shift available for pickup
    is_swapped = Column(Boolean, default=False, index=True)          # historical row left behind by a swap
    swapped_from_provider_id = Column(Integer, nullable=True)        # the prior holder when source='swap'
    swap_note = Column(String, nullable=True)
    is_open = Column(Boolean, default=False, index=True)             # surfaced on the portal Open Shifts tab
    source = Column(String, default="admin", index=True)             # admin|swap|pickup
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleMDSwapRequest(Base):
    __tablename__ = "schedulemd_swap_requests"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, index=True, nullable=False)
    requesting_provider_id = Column(Integer, index=True, nullable=False)
    receiving_provider_id = Column(Integer, index=True, nullable=True)  # null for "donate to pool"
    swap_type = Column(String, nullable=False)                          # direct|donate
    status = Column(String, default="pending", index=True)              # pending|auto_approved|approved|denied
    rule_violations = Column(JSON, default=list)                        # ["NO_NIGHT_AFTER_DAY", ...]
    requested_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class ScheduleMDEquity(Base):
    __tablename__ = "schedulemd_equity"
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, index=True, nullable=False)
    block_id = Column(Integer, index=True, nullable=False)
    contracted_shifts = Column(Integer, default=0)
    worked_shifts = Column(Integer, default=0)
    night_shifts = Column(Integer, default=0)
    weekend_shifts = Column(Integer, default=0)
    holiday_shifts = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
        # Per-window idempotency stamps for the appointment-reminders cron.
        # The /internal/jobs/appointment-reminders endpoint walks scheduled
        # appointments at 15-min cadence and sets the matching column when
        # it sends each reminder; subsequent runs in the same window
        # short-circuit on the non-NULL column.
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_appointments ADD COLUMN IF NOT EXISTS reminder_followup_sent_at TIMESTAMP"))
        # Distinguish stripe-paid vs comp/manual enrollments. Default
        # 'stripe' so existing rows are unchanged.
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'stripe'"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_payment_method ON concierge_patients(payment_method)"))
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
        conn.execute(text("ALTER TABLE concierge_inquiries ADD COLUMN IF NOT EXISTS insurance_acknowledged BOOLEAN DEFAULT FALSE"))
        # heard_from was added with the original tier-card form and removed
        # when the dropdown was retired. Drop the column at boot so the
        # schema matches the model — IF EXISTS keeps fresh installs happy.
        conn.execute(text("ALTER TABLE concierge_inquiries DROP COLUMN IF EXISTS heard_from"))

        # ─── 3-month-trial → annual lifecycle columns ───────────────
        # Idempotent. Postgres ENUM type is created first; the column then
        # references it. SQLAlchemy on a fresh table creates the enum for
        # us, but ALTER TABLE ADD COLUMN against an already-deployed table
        # needs the type to exist explicitly. The DO $$…$$ block makes the
        # CREATE TYPE itself idempotent (Postgres has no IF NOT EXISTS for
        # CREATE TYPE).
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status_enum') THEN
                    CREATE TYPE membership_status_enum AS ENUM (
                        'active_monthly',
                        'balance_invoice_sent',
                        'grace_period',
                        'active_annual',
                        'renewal_invoice_sent',
                        'renewal_grace_period',
                        'downgraded_alacarte'
                    );
                END IF;
            END$$;
        """))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS monthly_payment_count INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS remaining_balance_invoice_sent_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS remaining_balance_due_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS annual_start_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS annual_renewal_due_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS renewal_invoice_sent_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS is_first_year BOOLEAN DEFAULT TRUE"))
        conn.execute(text(
            "ALTER TABLE concierge_patients "
            "ADD COLUMN IF NOT EXISTS membership_status membership_status_enum "
            "DEFAULT 'active_monthly' NOT NULL"
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_monthly_payment_count ON concierge_patients(monthly_payment_count)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_is_first_year ON concierge_patients(is_first_year)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_membership_status ON concierge_patients(membership_status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_remaining_balance_due_at ON concierge_patients(remaining_balance_due_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_annual_renewal_due_at ON concierge_patients(annual_renewal_due_at)"))

        # ─── Age verification (18+ gate) ────────────────────────────
        conn.execute(text("ALTER TABLE concierge_patients ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_patients_age_verified ON concierge_patients(age_verified)"))
        conn.execute(text("ALTER TABLE concierge_patient_intake ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR"))
        conn.execute(text("ALTER TABLE concierge_patient_intake ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE concierge_patient_intake ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP"))

        # ─── Patient meditation prescriptions ────────────────────────
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS physician_id INTEGER"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS physician_note VARCHAR DEFAULT ''"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS frequency VARCHAR DEFAULT 'one_time'"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS played_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE concierge_meditation_assignments ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_meditation_assignments_is_completed ON concierge_meditation_assignments(is_completed)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_meditation_assignments_frequency ON concierge_meditation_assignments(frequency)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_concierge_meditation_assignments_next_send_at ON concierge_meditation_assignments(next_send_at)"))
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

# Seed ScheduleMD's hospital + shift catalog if empty. Idempotent — gated
# on the hospitals table being empty so existing deploys don't double-seed.
# Shifts are inserted with a global sort_order; the API filters by
# hospital_id and orders by sort_order for stable column rendering.
try:
    _seed_db = SessionLocal()
    if _seed_db.query(ScheduleMDHospital).count() == 0:
        imed = ScheduleMDHospital(name="IMED", color="#4A9B9B")
        av   = ScheduleMDHospital(name="AV",   color="#4CAF72")
        lds  = ScheduleMDHospital(name="LDS",  color="#7B68C8")
        _seed_db.add_all([imed, av, lds])
        _seed_db.flush()  # populate ids before referencing them below

        # Final shift times (after the two corrections in the spec):
        #   day:    06:00–18:00  (default)
        #   late:   09:00–21:00  (L1/L2/L)
        #   LDS M:  08:00–20:00  (mid)
        #   swing:  14–22 / 16–00  (IMED SW1/SW2/SW3)
        #   night:  22:00–06:00  (all NI, Moonlight, Backup Night, APP NI)
        #   admin:  07:00–17:00  (Admin of the Day)
        SHIFTS = [
            # IMED (sort_order ascending)
            (imed.id, "IMED E1",                "day",    "06:00", "18:00"),
            (imed.id, "IMED E2",                "day",    "06:00", "18:00"),
            (imed.id, "IMED L1",                "day",    "09:00", "21:00"),
            (imed.id, "IMED L2",                "day",    "09:00", "21:00"),
            *[(imed.id, f"IMED Team {i}",       "day",    "06:00", "18:00") for i in range(1, 11)],
            (imed.id, "IMED Team 11",           "day",    "06:00", "18:00"),  # spec calls this the day-side backup
            (imed.id, "IMED SW1",               "swing",  "14:00", "22:00"),
            (imed.id, "IMED SW2",               "swing",  "14:00", "22:00"),
            (imed.id, "IMED SW3",               "swing",  "16:00", "00:00"),
            (imed.id, "IMED NI 1",              "night",  "22:00", "06:00"),
            (imed.id, "IMED NI 2",              "night",  "22:00", "06:00"),
            (imed.id, "IMED APP A",             "app",    "06:00", "18:00"),
            (imed.id, "IMED APP B",             "app",    "06:00", "18:00"),
            (imed.id, "IMED APP NI",            "app",    "22:00", "06:00"),
            (imed.id, "IMED APP Orienting",     "app",    "06:00", "18:00"),
            (imed.id, "IMED APP NI Orienting",  "app",    "22:00", "06:00"),

            # AV
            (av.id,   "AV E",                   "day",    "06:00", "18:00"),
            (av.id,   "AV L",                   "day",    "09:00", "21:00"),
            (av.id,   "AV Team 1",              "day",    "06:00", "18:00"),
            (av.id,   "AV Team 2",              "day",    "06:00", "18:00"),
            (av.id,   "AV NI",                  "night",  "22:00", "06:00"),
            (av.id,   "AV Moonlight",           "night",  "22:00", "06:00"),
            (av.id,   "AV Orient 2",            "day",    "06:00", "18:00"),
            (av.id,   "Backup Day 1",           "backup", "06:00", "18:00"),
            (av.id,   "Backup Day 2",           "backup", "06:00", "18:00"),
            (av.id,   "Backup Night",           "backup", "22:00", "06:00"),
            (av.id,   "Admin of the Day",       "admin",  "07:00", "17:00"),

            # LDS
            (lds.id,  "LDS E",                  "day",    "06:00", "18:00"),
            (lds.id,  "LDS L",                  "day",    "09:00", "21:00"),
            (lds.id,  "LDS M",                  "day",    "08:00", "20:00"),
            (lds.id,  "LDS Team 1",             "day",    "06:00", "18:00"),
            (lds.id,  "LDS Team 2",             "day",    "06:00", "18:00"),
            (lds.id,  "LDS Team 3",             "day",    "06:00", "18:00"),
            (lds.id,  "LDS NI",                 "night",  "22:00", "06:00"),
            (lds.id,  "LDS Moonlight",          "night",  "22:00", "06:00"),
        ]
        for idx, (h_id, name, stype, start, end) in enumerate(SHIFTS):
            _seed_db.add(ScheduleMDShift(
                hospital_id=h_id, name=name, shift_type=stype,
                start_time=start, end_time=end, sort_order=idx,
            ))
        _seed_db.commit()
        print(f"Seeded ScheduleMD: 3 hospitals + {len(SHIFTS)} shifts.")
    _seed_db.close()
except Exception as e:  # never let seed failure block boot
    print(f"ScheduleMD seed skipped: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
