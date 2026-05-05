# Copyright 2026 SoulMD, LLC. All Rights Reserved.
# Unauthorized copying, modification, distribution or use of this software is strictly prohibited.

import sendgrid
from sendgrid.helpers.mail import Mail
import os

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "support@soulmd.us")
APP_URL = os.getenv("APP_URL", "https://ekgscan.com")

def send_verification_email(to_email: str, token: str):
    verify_url = f"{APP_URL}/verify?token={token}"
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="Verify your EKGScan account",
        html_content=f"""
        <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:40px 20px">
          <div style="text-align:center;margin-bottom:32px">
            <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#7ab0f0,#9b8fe8);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
              <span style="color:white;font-size:24px">🫀</span>
            </div>
            <h1 style="font-size:24px;font-weight:800;color:#1a2a4a;margin:0">EKGScan</h1>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#1a2a4a;margin-bottom:8px">Verify your email</h2>
          <p style="font-size:14px;color:#8aa0c0;line-height:1.6;margin-bottom:24px">
            Thanks for signing up! Click the button below to verify your email and get your free EKG scan.
          </p>
          <a href="{verify_url}" style="display:block;background:linear-gradient(135deg,#7ab0f0,#9b8fe8);color:white;text-decoration:none;border-radius:14px;padding:14px 24px;font-size:15px;font-weight:700;text-align:center;margin-bottom:24px">
            Verify My Email
          </a>
          <p style="font-size:12px;color:#a0b0c8;text-align:center;line-height:1.6">
            Or copy this link: {verify_url}<br><br>
            For clinical decision support only. AI interpretation must be reviewed by a qualified clinician.
          </p>
        </div>
        """
    )
    try:
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        sg.send(message)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False


# ─── ScheduleMD email helpers ─────────────────────────────────────────
# All ScheduleMD-related transactional email lives here so the call
# sites in main.py stay thin. Each function returns True on success,
# False on any exception — never raises, since email delivery is
# always best-effort and must not block the underlying request.

_SCHEDULEMD_FROM = "noreply@soulmd.us"

def _schedulemd_shell(title: str, body_html: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    """Wrap a ScheduleMD email body in the standard SoulMD layout."""
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <a href="{cta_url}" style="display:block;background:linear-gradient(135deg,#7ab0f0,#9b8fe8);color:white;text-decoration:none;border-radius:14px;padding:14px 24px;font-size:15px;font-weight:700;text-align:center;margin:24px 0">
          {cta_label}
        </a>
        """
    return f"""
    <div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;padding:40px 20px;color:#1a2a4a">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1a2a4a;letterspacing:0.04em">ScheduleMD</div>
        <div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#6B6889;font-weight:700;margin-top:4px">SoulMD · Scheduling Platform</div>
      </div>
      <h2 style="font-size:18px;font-weight:700;color:#1a2a4a;margin:0 0 8px">{title}</h2>
      <div style="font-size:14px;color:#3A3852;line-height:1.7">
        {body_html}
      </div>
      {cta_block}
      <p style="font-size:11px;color:#a0b0c8;text-align:center;line-height:1.6;margin-top:32px">
        SoulMD, LLC · noreply@soulmd.us<br/>
        Sent from the ScheduleMD scheduling platform.
      </p>
    </div>
    """

def send_schedulemd_magic_link(to_email: str, full_name: str, token: str) -> bool:
    """Provider portal access. Token-bearing URL — no password.
    Recipients land directly on /schedulemd/portal?token=… ."""
    portal_url = f"{APP_URL}/schedulemd/portal?token={token}"
    body = f"""
        <p>Hi {full_name or 'there'},</p>
        <p>You've been invited to the <strong>ScheduleMD</strong> physician portal.
        Click the button below to view your schedule, submit preferences,
        request time off, or pick up open shifts.</p>
        <p style="font-size:12px;color:#6B6889">
          The link is valid for 30 days. If it expires, ask the scheduling
          admin to send you a new one.
        </p>
    """
    msg = Mail(
        from_email=_SCHEDULEMD_FROM, to_emails=to_email,
        subject="Your ScheduleMD Portal Access",
        html_content=_schedulemd_shell("Sign in to your portal", body, "Open ScheduleMD Portal", portal_url),
    )
    try:
        sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY).send(msg)
        return True
    except Exception as e:
        print(f"schedulemd magic-link email error: {e}")
        return False

def send_schedulemd_block_published(to_email: str, full_name: str, block_name: str, ics_text: str | None = None, schedule_summary_html: str = "") -> bool:
    """Notify a provider that the block they're scheduled in has been
    published. ics_text, when provided, is attached as schedule.ics
    so the recipient can one-click-add their shifts to a calendar."""
    body = f"""
        <p>Hi {full_name or 'there'},</p>
        <p>Your schedule for <strong>{block_name}</strong> has been published.
        Your assigned shifts are listed below; an iCal attachment is included
        so you can drop them into your calendar.</p>
        {schedule_summary_html}
    """
    msg = Mail(
        from_email=_SCHEDULEMD_FROM, to_emails=to_email,
        subject=f"Your schedule for {block_name} is ready",
        html_content=_schedulemd_shell(f"Schedule published: {block_name}", body),
    )
    if ics_text:
        try:
            import base64 as _b64
            from sendgrid.helpers.mail import Attachment, FileContent, FileName, FileType, Disposition
            encoded = _b64.b64encode(ics_text.encode("utf-8")).decode()
            msg.attachment = Attachment(
                FileContent(encoded),
                FileName("schedule.ics"),
                FileType("text/calendar"),
                Disposition("attachment"),
            )
        except Exception as e:
            print(f"schedulemd ics attach error: {e}")
    try:
        sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY).send(msg)
        return True
    except Exception as e:
        print(f"schedulemd published email error: {e}")
        return False

def send_schedulemd_time_off_admin(admin_email: str, provider_name: str, start_date: str, end_date: str, reason: str, note: str) -> bool:
    body = f"""
        <p>A time-off request was submitted:</p>
        <ul>
          <li><strong>Provider:</strong> {provider_name}</li>
          <li><strong>Range:</strong> {start_date} → {end_date}</li>
          <li><strong>Reason:</strong> {reason or '—'}</li>
          <li><strong>Note:</strong> {note or '—'}</li>
        </ul>
        <p>Open ScheduleMD → Preferences &amp; Time Off → Time Off to approve or deny.</p>
    """
    msg = Mail(
        from_email=_SCHEDULEMD_FROM, to_emails=admin_email,
        subject=f"Time-off request: {provider_name} ({start_date} → {end_date})",
        html_content=_schedulemd_shell("New time-off request", body),
    )
    try:
        sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY).send(msg)
        return True
    except Exception as e:
        print(f"schedulemd time-off-admin email error: {e}")
        return False

def send_schedulemd_time_off_decision(to_email: str, full_name: str, start_date: str, end_date: str, status: str) -> bool:
    decision_label = {"approved": "approved", "denied": "denied"}.get(status, status)
    body = f"""
        <p>Hi {full_name or 'there'},</p>
        <p>Your time-off request from <strong>{start_date}</strong> to
        <strong>{end_date}</strong> has been <strong>{decision_label}</strong>.</p>
    """
    msg = Mail(
        from_email=_SCHEDULEMD_FROM, to_emails=to_email,
        subject=f"Time off {decision_label}: {start_date} → {end_date}",
        html_content=_schedulemd_shell(f"Time off {decision_label}", body),
    )
    try:
        sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY).send(msg)
        return True
    except Exception as e:
        print(f"schedulemd time-off-decision email error: {e}")
        return False

def send_schedulemd_swap_decision(to_email: str, full_name: str, status: str, shift_label: str) -> bool:
    """Notify a provider their swap was auto-approved / approved / denied.
    Used for both directions of a direct swap (each side gets one)."""
    body = f"""
        <p>Hi {full_name or 'there'},</p>
        <p>Your swap involving <strong>{shift_label}</strong> was
        <strong>{status}</strong>.</p>
    """
    msg = Mail(
        from_email=_SCHEDULEMD_FROM, to_emails=to_email,
        subject=f"Swap {status}: {shift_label}",
        html_content=_schedulemd_shell(f"Swap {status}", body),
    )
    try:
        sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY).send(msg)
        return True
    except Exception as e:
        print(f"schedulemd swap-decision email error: {e}")
        return False

def send_schedulemd_swap_admin(admin_email: str, requesting_name: str, receiving_name: str | None, shift_label: str, violations: list) -> bool:
    receiver_line = f"<li><strong>To:</strong> {receiving_name}</li>" if receiving_name else "<li><strong>Type:</strong> Donate to pool</li>"
    violations_html = ""
    if violations:
        items = "".join(f"<li style='color:#9A2A2A'>{v}</li>" for v in violations)
        violations_html = f"<p><strong>Rule violations:</strong></p><ul>{items}</ul>"
    body = f"""
        <p>A swap request needs review:</p>
        <ul>
          <li><strong>Shift:</strong> {shift_label}</li>
          <li><strong>From:</strong> {requesting_name}</li>
          {receiver_line}
        </ul>
        {violations_html}
        <p>Open ScheduleMD → Swaps to approve or deny.</p>
    """
    msg = Mail(
        from_email=_SCHEDULEMD_FROM, to_emails=admin_email,
        subject=f"Swap pending review: {shift_label}",
        html_content=_schedulemd_shell("Swap pending review", body),
    )
    try:
        sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY).send(msg)
        return True
    except Exception as e:
        print(f"schedulemd swap-admin email error: {e}")
        return False
