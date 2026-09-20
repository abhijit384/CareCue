"""
Security and Credential Hygiene Tests.
Verifies no real Google or AWS API keys exist in repository code, configs, or frontend assets.
"""

import os
import re
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

GOOGLE_API_KEY_PATTERN = re.compile(r"\bAIzaSy[A-Za-z0-9-_]{33}\b")
AWS_KEY_PATTERN = re.compile(r"\bAKIA[0-9A-Z]{16}\b")


def test_no_api_keys_in_backend():
    backend_dir = os.path.join(REPO_ROOT, "backend")
    vendor_dirs = {"botocore", "boto3", "google", "pydantic", "pydantic_core", "urllib3", "requests", "certifi", "httpx", "httpcore", "cryptography", "cffi", "pyasn1", "dist-info"}
    for root, dirs, files in os.walk(backend_dir):
        # Exclude vendor package subdirectories
        dirs[:] = [d for d in dirs if not any(v in d.lower() for v in vendor_dirs)]
        for f in files:
            if f.endswith((".py", ".json", ".yaml", ".yml", ".md")):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                    # Exclude the test itself and security filter pattern definition
                    if "test_secrets_hygiene.py" in f or "output_safety_filter.py" in f:
                        continue
                    assert not GOOGLE_API_KEY_PATTERN.search(content), f"Potential Google API key in {path}"
                    assert not AWS_KEY_PATTERN.search(content), f"Potential AWS Access Key in {path}"


def test_no_api_keys_in_frontend_source():
    frontend_src = os.path.join(REPO_ROOT, "frontend", "src")
    for root, _, files in os.walk(frontend_src):
        for f in files:
            if f.endswith((".ts", ".tsx", ".js", ".jsx", ".json", ".css")):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                    assert not GOOGLE_API_KEY_PATTERN.search(content), f"Potential Google API key in {path}"
                    assert not AWS_KEY_PATTERN.search(content), f"Potential AWS Access Key in {path}"
                    assert "GEMINI_API_KEY" not in content, f"Frontend must never reference GEMINI_API_KEY: {path}"


def test_gitignore_protects_secrets():
    gitignore_path = os.path.join(REPO_ROOT, ".gitignore")
    assert os.path.exists(gitignore_path), ".gitignore missing from repository root"
    with open(gitignore_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert ".env" in content
    assert "*.key" in content or "*.pem" in content
    assert "samconfig.toml" in content
