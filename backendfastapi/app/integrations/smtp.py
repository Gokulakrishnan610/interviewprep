from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    """
    Send a single email via SMTP (TLS/STARTTLS).

    Returns True on success, False on any failure.
    Never raises — auth flows should not break on email errors.
    Logs the error so ops can investigate.
    """
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP credentials not configured — skipping email to %s (subject: %s)",
            to, subject,
        )
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.DEFAULT_FROM_NAME} <{settings.DEFAULT_FROM_EMAIL}>"
    message["To"] = to

    if text_body:
        message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("Email sent to %s (subject: %s)", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


async def send_verification_email(
    *,
    to_email: str,
    to_name: str,
    verification_url: str,
) -> bool:
    subject = "Verify your email — Interview Prep AI"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; color: #333; max-width: 560px; margin: auto; padding: 24px;">
        <h2>Hi {to_name},</h2>
        <p>Thanks for signing up for <strong>Interview Prep AI</strong>.</p>
        <p>Please verify your email address to activate your account:</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{verification_url}"
               style="background:#4F46E5;color:#fff;padding:12px 24px;
                      border-radius:6px;text-decoration:none;font-weight:bold;">
                Verify Email
            </a>
        </p>
        <p style="font-size: 0.85em; color: #888;">
            This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.<br>
            If you didn't create an account, you can safely ignore this email.
        </p>
    </body>
    </html>
    """

    text_body = (
        f"Hi {to_name},\n\n"
        f"Please verify your email by visiting:\n{verification_url}\n\n"
        f"This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours."
    )

    return await send_email(
        to=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
    )
