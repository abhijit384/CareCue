#!/usr/bin/env python3
"""
scripts/test_email_smtp.py - Real Gmail SMTP connection, authentication & test delivery.
Safe diagnostics only: NEVER prints passwords or secret credentials.
"""

import os
import sys
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# Step 1: Environment loading
root_dir = Path(__file__).resolve().parent.parent
backend_env = root_dir / "backend" / ".env"
root_env = root_dir / ".env"

if backend_env.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(backend_env)
    except ImportError:
        pass
elif root_env.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(root_env)
    except ImportError:
        pass

def run_smtp_diagnostic() -> bool:
    print("=================================")
    print("CARECUE SMTP DIAGNOSTIC")
    print("=================================")

    # STEP 1: Environment loaded
    print("\nSTEP 1")
    print("Environment loaded")

    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")

    if not username or not password or password == "YOUR_GOOGLE_APP_PASSWORD":
        print("\n[FAIL] INVALID SMTP CONFIGURATION")
        print("SMTP_USERNAME or SMTP_PASSWORD is not configured in backend/.env")
        return False

    masked_user = f"{username[:3]}***@{username.split('@')[-1]}" if "@" in username else "CONFIGURED"

    # STEP 2: SMTP host resolved
    print("\nSTEP 2")
    try:
        ip_addr = socket.gethostbyname(host)
        print(f"SMTP host resolved: {host} -> {ip_addr}")
    except socket.gaierror as e:
        print(f"\n[FAIL] SMTP CONNECTION FAILED: DNS Resolution Error ({e})")
        return False

    # STEP 3: TCP connection established
    print("\nSTEP 3")
    try:
        server = smtplib.SMTP(host, port, timeout=15)
        server.ehlo()
        print(f"TCP connection established to {host}:{port}")
    except Exception as e:
        print(f"\n[FAIL] SMTP CONNECTION FAILED: Could not connect ({type(e).__name__})")
        return False

    # STEP 4: STARTTLS successful
    print("\nSTEP 4")
    try:
        if use_tls:
            server.starttls()
            server.ehlo()
            print("STARTTLS successful")
        else:
            print("TLS: Skipped (Not enabled)")
    except Exception as e:
        print(f"\n[FAIL] TLS INITIALIZATION FAILED: ({type(e).__name__})")
        try:
            server.quit()
        except Exception:
            pass
        return False

    # STEP 5: SMTP authentication successful
    print("\nSTEP 5")
    try:
        server.login(username, password)
        print("SMTP authentication successful")
    except smtplib.SMTPAuthenticationError:
        print("\n[FAIL] SMTP AUTHENTICATION FAILED: Bad credentials (check Google App Password)")
        try:
            server.quit()
        except Exception:
            pass
        return False
    except Exception as e:
        print(f"\n[FAIL] SMTP AUTHENTICATION FAILED: ({type(e).__name__})")
        try:
            server.quit()
        except Exception:
            pass
        return False

    # STEP 6: Email service ready & send 1 test email
    print("\nSTEP 6")
    print("Email service ready")

    # Send ONE test email to SMTP_USERNAME
    test_recipient = username
    print(f"\nSending one test email to: {masked_user}...")
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your CareCue account"
        msg["From"] = f"CareCue <{username}>"
        msg["To"] = test_recipient

        text_body = (
            "Hi Test User,\n\n"
            "Your CareCue verification code is:\n\n"
            "123456\n\n"
            "This code expires in 10 minutes.\n\n"
            "If you did not create this account, you can ignore this email.\n\n"
            "Regards,\n"
            "CareCue\n"
        )
        msg.attach(MIMEText(text_body, "plain"))
        server.send_message(msg)
        server.quit()
        print("TEST EMAIL: SENT SUCCESSFULLY")
        test_email_success = True
    except Exception as e:
        print(f"TEST EMAIL: FAILED ({type(e).__name__}: {e})")
        test_email_success = False
        try:
            server.quit()
        except Exception:
            pass

    # Final Summary Banner
    print("\n=================================")
    print("CARECUE SMTP DIAGNOSTIC")
    print("=================================")
    print("\nEnvironment:\nLOADED")
    print(f"\nSMTP Host:\n{host}")
    print(f"\nSMTP Port:\n{port}")
    print(f"\nUsername:\nCONFIGURED ({masked_user})")
    print("\nPassword:\nCONFIGURED")
    print(f"\nTLS:\n{'ENABLED' if use_tls else 'DISABLED'}")
    print("\nAuthentication:\nSUCCESS")
    print(f"\nTest Email:\n{'SUCCESS' if test_email_success else 'FAILED'}")
    print("=================================")

    return test_email_success

if __name__ == "__main__":
    success = run_smtp_diagnostic()
    sys.exit(0 if success else 1)
