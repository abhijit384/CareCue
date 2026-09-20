"""
backend/services/auth_service.py - Authentication, OTP Verification, and Security Engine.

Enforces:
1. Live & Backend Password Requirements:
   - Minimum 8 characters
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one number (0-9)
   - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
   - No whitespace
2. Cryptographic Salted Password Hashing (passwords never stored in plaintext)
3. Cryptographic 6-Digit Email OTP:
   - Stored hashed in database
   - 10-minute expiration
   - Maximum 5 attempts
   - 60-second resend cooldown
4. Secure Email Sender:
   - Amazon SES when AWS credentials/SES_FROM_EMAIL are configured
   - Secure logging fallback in development/sandbox
   - PASSWORDS ARE NEVER EMAILED UNDER ANY CIRCUMSTANCES.
"""

import os
import re
import hmac
import json
import uuid
import time
import hashlib
import secrets
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

_backend_env = Path(__file__).resolve().parent.parent / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env, override=True)
if _root_env.exists():
    load_dotenv(_root_env, override=False)

from ..database.db import get_db_connection

logger = logging.getLogger(__name__)

OTP_EXPIRATION_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60

# --- Password Validation Rules ---

def validate_password(password: str) -> Tuple[bool, List[str]]:
    """
    Validates a password against all 6 CareCue security rules.
    Returns (is_valid, list_of_unmet_reasons).
    """
    errors = []
    if len(password) < 8:
        errors.append("At least 8 characters")
    if not re.search(r"[A-Z]", password):
        errors.append("At least one uppercase letter (A-Z)")
    if not re.search(r"[a-z]", password):
        errors.append("At least one lowercase letter (a-z)")
    if not re.search(r"[0-9]", password):
        errors.append("At least one number (0-9)")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]", password):
        errors.append("At least one special character")
    if re.search(r"\s", password):
        errors.append("No spaces allowed")

    return len(errors) == 0, errors

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Generates a salted PBKDF2-SHA256 hash. Format: pbkdf2$iterations$salt$hash."""
    if not salt:
        salt = secrets.token_hex(16)
    iterations = 120000
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
    return f"pbkdf2${iterations}${salt}${hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a candidate password against PBKDF2 or legacy salt$hash values."""
    try:
        if stored_hash.startswith("pbkdf2$"):
            _, iter_s, salt, expected_hash = stored_hash.split("$", 3)
            actual_hash = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iter_s)
            ).hex()
            return hmac.compare_digest(actual_hash, expected_hash)
        salt, expected_hash = stored_hash.split("$", 1)
        actual_hash = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False

def hash_otp(otp: str) -> str:
    """Hashes the 6-digit OTP so it is not stored in plaintext."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- Email Sender (Gmail SMTP for Localhost, SES for Cloud, with Dev Logger) ---

# --- Email Sender (Gmail SMTP for Localhost, SES for Cloud, with Dev Logger) ---

def send_email_otp(to_email: str, otp: str, first_name: str = "there", purpose: str = "signup") -> Tuple[bool, Optional[str]]:
    """
    Sends 6-digit OTP to user email via Gmail SMTP (localhost) or AWS SES (cloud).
    Returns (success: bool, error_message: Optional[str]).
    Never logs passwords, tokens, or plaintext OTPs.
    """
    masked_email = re.sub(r"(?<=^.{2}).(?=.*@)", "*", to_email)
    subject = "Verify your CareCue account" if purpose == "signup" else "Reset your CareCue password"
    
    # 1. Check Gmail SMTP (Localhost default)
    # Ensure fresh read from .env if needed
    _b_env = Path(__file__).resolve().parent.parent / ".env"
    if _b_env.exists():
        load_dotenv(_b_env, override=True)
    _r_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if _r_env.exists():
        load_dotenv(_r_env, override=True)

    smtp_username = (os.environ.get("SMTP_USERNAME") or "").strip()
    smtp_password = (os.environ.get("SMTP_PASSWORD") or "").strip()
    
    if smtp_username and smtp_password and smtp_password != "YOUR_GOOGLE_APP_PASSWORD":
        try:
            logger.info(f"OTP email send started to {masked_email} via {smtp_username}")
            smtp_host = (os.environ.get("SMTP_HOST") or "smtp.gmail.com").strip()
            smtp_port = int((os.environ.get("SMTP_PORT") or "587").strip())
            smtp_use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"CareCue <{smtp_username}>"
            msg["To"] = to_email

            text_body = (
                f"Hi {first_name},\n\n"
                f"Your CareCue verification code is:\n\n"
                f"{otp}\n\n"
                f"This code expires in {OTP_EXPIRATION_MINUTES} minutes.\n\n"
                f"If you did not create this account, you can ignore this email.\n\n"
                f"Regards,\n"
                f"CareCue\n"
            )
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #0d9488; margin: 0; font-size: 24px; font-weight: 700;">CareCue</h2>
                    <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Privacy-First Clinical Companion</p>
                </div>
                <p style="color: #334155; font-size: 15px; margin-bottom: 12px;">Hi {first_name},</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your CareCue verification code is:</p>
                <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; padding: 18px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #0f766e; font-family: monospace;">{otp}</span>
                </div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 6px;">This code expires in <strong>{OTP_EXPIRATION_MINUTES} minutes</strong>.</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    If you did not create this account, you can safely ignore this email.
                </p>
                <p style="color: #64748b; font-size: 13px; margin-top: 12px;">Regards,<br><strong>CareCue Team</strong></p>
            </div>
            """

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.ehlo()
            if smtp_use_tls:
                server.starttls()
                server.ehlo()
            server.login(smtp_username, smtp_password)
            logger.info("SMTP authentication successful")
            server.send_message(msg)
            server.quit()
            logger.info("Email accepted by SMTP server")
            logger.info(f"OTP delivery process completed for recipient {masked_email}")
            return True, None
        except smtplib.SMTPAuthenticationError:
            err = "EMAIL DELIVERY FAILED: SMTP authentication failed."
            logger.error("[SMTP] Authentication failed")
            return False, err
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected) as e:
            err = "EMAIL DELIVERY FAILED: Could not reach the Gmail SMTP server."
            logger.error(f"[SMTP] Connection failed ({type(e).__name__})")
            return False, err
        except smtplib.SMTPRecipientsRefused:
            err = "EMAIL DELIVERY FAILED: Recipient refused by Gmail SMTP."
            logger.error("[SMTP] Recipient refused")
            return False, err
        except Exception as e:
            err = f"EMAIL DELIVERY FAILED: {type(e).__name__}"
            logger.error(f"[SMTP] Gmail SMTP delivery failed ({err})")
            return False, err

    logger.error("[SMTP] EMAIL DELIVERY FAILED: Gmail SMTP is not configured for localhost.")
    return False, "EMAIL DELIVERY FAILED: SMTP is not configured."

# --- Authentication Service Class ---

class AuthService:
    """Manages user registration, email OTP lifecycle, login, and password resets."""

    def signup(
        self,
        first_name: str,
        last_name: str,
        email: str,
        password: str,
        confirm_password: str,
    ) -> Dict[str, Any]:
        """
        Account-level registration.
        Does NOT ask for patient name or create a patient.
        """
        logger.info("Signup requested")
        email_clean = email.strip().lower()
        first_name_clean = first_name.strip()
        last_name_clean = last_name.strip()

        if not email_clean or not first_name_clean or not last_name_clean:
            raise ValueError("First name, last name, and email are required.")

        if password != confirm_password:
            raise ValueError("Passwords do not match.")

        is_valid, errors = validate_password(password)
        if not is_valid:
            raise ValueError(f"Password requirement not met: {', '.join(errors)}")

        logger.info("Account validation passed")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id, email_verified FROM users WHERE email = ?;", (email_clean,))
            existing = cursor.fetchone()
            now = datetime.now(timezone.utc).isoformat()

            if existing:
                if existing["email_verified"] == 1:
                    raise ValueError("An account with this email already exists. Please sign in.")
                user_id = existing["user_id"]
                # Update password hash
                pwd_hash = hash_password(password)
                cursor.execute(
                    "UPDATE users SET first_name = ?, last_name = ?, password_hash = ?, updated_at = ? WHERE user_id = ?;",
                    (first_name_clean, last_name_clean, pwd_hash, now, user_id)
                )
            else:
                user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
                pwd_hash = hash_password(password)
                cursor.execute(
                    "INSERT INTO users (user_id, first_name, last_name, email, password_hash, email_verified, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, 0, ?, ?);",
                    (user_id, first_name_clean, last_name_clean, email_clean, pwd_hash, now, now)
                )
            conn.commit()

        logger.info("Pending account created")

        # Generate and issue 6-digit OTP
        otp = self._generate_and_store_otp(email_clean, purpose="signup")
        logger.info("OTP generated")
        logger.info("OTP hash stored")

        email_sent, err_msg = send_email_otp(email_clean, otp, first_name=first_name_clean, purpose="signup")

        if email_sent:
            return {
                "success": True,
                "userId": user_id,
                "email": email_clean,
                "firstName": first_name_clean,
                "lastName": last_name_clean,
                "status": "OTP_SENT",
                "message": f"Verification code sent to {email_clean}. Please check your inbox."
            }
        else:
            return {
                "success": False,
                "userId": user_id,
                "email": email_clean,
                "firstName": first_name_clean,
                "lastName": last_name_clean,
                "status": "ACCOUNT_CREATED_EMAIL_FAILED",
                "message": f"Account created, but email delivery failed ({err_msg or 'SMTP delivery error'}). Click Resend to try again."
            }

    def verify_otp(self, email: str, otp: str, purpose: str = "signup") -> Dict[str, Any]:
        """Verifies a 6-digit OTP, activating account if signup."""
        email_clean = email.strip().lower()
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM email_otps WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1;",
                (email_clean, purpose)
            )
            record = cursor.fetchone()
            if not record:
                raise ValueError("No verification code found. Please request a new code.")

            attempts = record["attempts"]
            max_attempts = record["max_attempts"]
            expires_at = datetime.fromisoformat(record["expires_at"])

            if attempts >= max_attempts:
                raise ValueError("Maximum verification attempts exceeded. Please request a new code.")

            if now_dt > expires_at:
                raise ValueError("Verification code has expired. Please request a new code.")

            # Check OTP match
            candidate_hash = hash_otp(otp.strip())
            if not hmac.compare_digest(candidate_hash, record["otp_hash"]):
                cursor.execute(
                    "UPDATE email_otps SET attempts = attempts + 1 WHERE otp_id = ?;",
                    (record["otp_id"],)
                )
                conn.commit()
                remaining = max_attempts - (attempts + 1)
                raise ValueError(f"Invalid verification code. {remaining} attempts remaining.")

            # OTP verified successfully - delete OTP record
            cursor.execute("DELETE FROM email_otps WHERE otp_id = ?;", (record["otp_id"],))

            if purpose == "signup":
                cursor.execute(
                    "UPDATE users SET email_verified = 1, updated_at = ? WHERE email = ?;",
                    (now_iso, email_clean)
                )
                cursor.execute("SELECT * FROM users WHERE email = ?;", (email_clean,))
                user_row = cursor.fetchone()
                conn.commit()
                token = f"sess-{uuid.uuid4().hex}"
                return {
                    "success": True,
                    "verified": True,
                    "purpose": purpose,
                    "user": self._row_to_user_dict(user_row),
                    "token": token,
                    "message": "Account verified successfully. Welcome to CareCue!"
                }
            else:
                conn.commit()
                return {
                    "success": True,
                    "verified": True,
                    "purpose": purpose,
                    "email": email_clean,
                    "message": "Verification code confirmed. You may now reset your password."
                }

    def resend_otp(self, email: str, purpose: str = "signup") -> Dict[str, Any]:
        """Resends 6-digit OTP enforcing a 60-second cooldown."""
        email_clean = email.strip().lower()
        now_dt = datetime.now(timezone.utc)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT resend_available_at FROM email_otps WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1;",
                (email_clean, purpose)
            )
            record = cursor.fetchone()
            if record:
                resend_at = datetime.fromisoformat(record["resend_available_at"])
                if now_dt < resend_at:
                    wait_secs = int((resend_at - now_dt).total_seconds())
                    raise ValueError(f"Please wait {wait_secs} seconds before requesting a new code.")

        first_name = "there"
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT first_name FROM users WHERE email = ?;", (email_clean,))
            u_row = cursor.fetchone()
            if u_row and u_row["first_name"]:
                first_name = u_row["first_name"]

        otp = self._generate_and_store_otp(email_clean, purpose=purpose)
        email_sent, err_msg = send_email_otp(email_clean, otp, first_name=first_name, purpose=purpose)
        if email_sent:
            return {
                "success": True,
                "status": "RESENT",
                "message": f"A new verification code was sent to {email_clean}."
            }
        else:
            return {
                "success": False,
                "status": "RESEND_EMAIL_FAILED",
                "message": f"Could not dispatch email ({err_msg or 'SMTP error'}). Please try again."
            }

    def signin(self, email: str, password: str) -> Dict[str, Any]:
        """Signs in a user with email and password."""
        email_clean = email.strip().lower()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?;", (email_clean,))
            user_row = cursor.fetchone()

        if not user_row:
            raise ValueError("Invalid email or password.")

        if not verify_password(password, user_row["password_hash"]):
            raise ValueError("Invalid email or password.")

        if user_row["email_verified"] == 0:
            otp = self._generate_and_store_otp(email_clean, purpose="signup")
            send_email_otp(email_clean, otp, first_name=user_row.get("first_name", "there"), purpose="signup")
            return {
                "success": False,
                "status": "OTP_REQUIRED",
                "requiresVerification": True,
                "email": email_clean,
                "message": "Email not verified yet. We have sent a verification code to your email."
            }

        user_dict = self._row_to_user_dict(user_row)
        token = f"sess-{uuid.uuid4().hex}"
        return {
            "success": True,
            "status": "SUCCESS",
            "user": user_dict,
            "token": token,
            "message": f"Welcome back, {user_dict['firstName']}!"
        }

    def demo_signin(self) -> Dict[str, Any]:
        """Direct Demo Sign In for instant evaluation and access without credentials or OTP."""
        demo_email = "demo@carecue.health"
        now = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?;", (demo_email,))
            user_row = cursor.fetchone()
            if not user_row:
                user_id = "USR-DEMO01"
                pwd_hash = hash_password("CareCueDemo@2026")
                cursor.execute(
                    "INSERT INTO users (user_id, first_name, last_name, email, password_hash, email_verified, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, 1, ?, ?);",
                    (user_id, "Demo", "User", demo_email, pwd_hash, now, now)
                )
                conn.commit()
                cursor.execute("SELECT * FROM users WHERE user_id = ?;", (user_id,))
                user_row = cursor.fetchone()

        user_dict = self._row_to_user_dict(user_row)
        token = f"sess-demo-{uuid.uuid4().hex}"
        return {
            "success": True,
            "status": "SUCCESS",
            "user": user_dict,
            "token": token,
            "message": "Demo Sign In successful! Welcome to CareCue."
        }

    def forgot_password(self, email: str) -> Dict[str, Any]:
        """Sends OTP to user email for password reset."""
        email_clean = email.strip().lower()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id, first_name FROM users WHERE email = ?;", (email_clean,))
            user_row = cursor.fetchone()

        if not user_row:
            # Mask user existence for privacy
            return {
                "success": True,
                "status": "OTP_SENT",
                "message": "If an account with that email exists, a verification code has been sent."
            }

        first_name = user_row.get("first_name", "there")
        otp = self._generate_and_store_otp(email_clean, purpose="reset")
        send_email_otp(email_clean, otp, first_name=first_name, purpose="reset")
        return {
            "success": True,
            "status": "OTP_SENT",
            "email": email_clean,
            "message": f"Password reset verification code sent to {email_clean}."
        }

    def reset_password(
        self,
        email: str,
        otp: str,
        new_password: str,
        confirm_password: str
    ) -> Dict[str, Any]:
        """Verifies OTP and updates user password with live security checks."""
        email_clean = email.strip().lower()

        if new_password != confirm_password:
            raise ValueError("Passwords do not match.")

        is_valid, errors = validate_password(new_password)
        if not is_valid:
            raise ValueError(f"Password requirement not met: {', '.join(errors)}")

        # Verify OTP first
        self.verify_otp(email_clean, otp, purpose="reset")

        new_hash = hash_password(new_password)
        now = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?;",
                (new_hash, now, email_clean)
            )
            conn.commit()

        return {
            "success": True,
            "status": "SUCCESS",
            "message": "Password reset successful. You may now sign in with your new password."
        }

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile without password hash."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE user_id = ?;", (user_id,))
            row = cursor.fetchone()
            return self._row_to_user_dict(row) if row else None

    # --- Internal Helpers ---

    def _generate_and_store_otp(self, email: str, purpose: str) -> str:
        """Generates a secure 6-digit OTP and records it hashed in SQLite."""
        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_id = f"otp-{uuid.uuid4().hex[:8]}"
        now_dt = datetime.now(timezone.utc)
        expires_dt = now_dt + timedelta(minutes=OTP_EXPIRATION_MINUTES)
        resend_dt = now_dt + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)

        otp_hash = hash_otp(otp)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM email_otps WHERE email = ? AND purpose = ?;", (email, purpose))
            cursor.execute("""
            INSERT INTO email_otps (
                otp_id, email, otp_hash, purpose, attempts, max_attempts,
                resend_available_at, expires_at, created_at
            ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?);
            """, (
                otp_id,
                email,
                otp_hash,
                purpose,
                OTP_MAX_ATTEMPTS,
                resend_dt.isoformat(),
                expires_dt.isoformat(),
                now_dt.isoformat()
            ))
            conn.commit()

        return otp

    def _row_to_user_dict(self, row: Any) -> Dict[str, Any]:
        d = dict(row)
        return {
            "userId": d["user_id"],
            "firstName": d["first_name"],
            "lastName": d["last_name"],
            "email": d["email"],
            "emailVerified": bool(d["email_verified"]),
            "createdAt": d["created_at"],
            "updatedAt": d["updated_at"],
        }
