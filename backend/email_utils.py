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
