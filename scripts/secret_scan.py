"""
Comprehensive secret scanner for CareCue repository.
Scans for actual API keys, private keys, AWS credentials, and tokens.
Does not print secret values.
"""

import os
import re
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
}

PATTERNS = {
    "AWS Access Key ID": re.compile(r"\b(AKIA|ASIA|AROA)[0-9A-Z]{16}\b"),
    "Google / Gemini API Key": re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"),
    "RSA / SSH Private Key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "Hardcoded AWS Secret Key assignment": re.compile(r"(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*=\s*['\"][A-Za-z0-9/+=]{40}['\"]"),
}

PLACEHOLDER_ALLOWLIST = {
    "your_aws_region_here",
    "your_gemini_api_key_here",
    "YOUR_GEMINI_API_KEY",
    "YOUR_AWS_ACCESS_KEY_ID",
    "YOUR_AWS_SECRET_ACCESS_KEY",
}

findings = []

for root, dirs, files in os.walk(REPO_ROOT):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for file in files:
        if file.endswith((".pyc", ".png", ".jpg", ".jpeg", ".ico", ".svg", ".zip", ".woff", ".woff2")):
            continue
        filepath = os.path.join(root, file)
        relpath = os.path.relpath(filepath, REPO_ROOT)
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                for line_num, line in enumerate(f, start=1):
                    for name, pattern in PATTERNS.items():
                        match = pattern.search(line)
                        if match:
                            val = match.group(0)
                            if any(p in val for p in PLACEHOLDER_ALLOWLIST):
                                continue
                            findings.append((relpath, line_num, name))
        except Exception as e:
            print(f"Could not read {relpath}: {e}")

print("=== REPOSITORY SECRET AUDIT RESULTS ===")
if findings:
    print(f"WARNING: {len(findings)} potential secret(s) detected:")
    for path, line, name in findings:
        print(f"  - {path}:{line} -> {name}")
    sys.exit(1)
else:
    print("ALL CLEAN: 0 secrets detected across entire codebase!")
    sys.exit(0)
