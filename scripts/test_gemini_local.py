#!/usr/bin/env python3
"""
scripts/test_gemini_local.py - Local Gemini 3.5 Flash connectivity test.
Strict diagnostic tester using the official google-genai SDK.
Never prints or logs secret credentials or API keys.
"""

import os
import sys
from pathlib import Path

# Resolve environment
root_dir = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
    backend_env = root_dir / "backend" / ".env"
    root_env = root_dir / ".env"
    if backend_env.exists():
        load_dotenv(backend_env)
    elif root_env.exists():
        load_dotenv(root_env)
except ImportError:
    pass

# Fallback resolution from infrastructure/local-env.json if env is not loaded
if not os.environ.get("GEMINI_API_KEY"):
    local_env_json = root_dir / "infrastructure" / "local-env.json"
    if local_env_json.exists():
        import json
        try:
            with open(local_env_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("GEMINI_API_KEY") and not data["GEMINI_API_KEY"].startswith("YOUR_"):
                    os.environ["GEMINI_API_KEY"] = data["GEMINI_API_KEY"]
        except Exception:
            pass

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Gemini configuration: MISSING", flush=True)
        return 1

    print("Gemini configuration: PRESENT", flush=True)
    model_id = os.environ.get("GEMINI_MODEL_ID", "gemini-3.5-flash")
    print(f"Gemini model: {model_id}", flush=True)

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("Gemini request: FAILED (google-genai SDK not installed)", flush=True)
        return 1

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=30000,
                retry_options=types.HttpRetryOptions(attempts=1)
            )
        )
        try:
            interaction = client.interactions.create(
                model=model_id,
                input="In one concise sentence, what is the role of insulin?",
                system_instruction="You are CareCue Clinical AI, an educational healthcare assistant."
            )
            out = getattr(interaction, "output_text", None)
            if not out and hasattr(interaction, "steps"):
                for step in interaction.steps:
                    if hasattr(step, "content"):
                        for item in step.content:
                            if hasattr(item, "text"):
                                out = item.text
                                break
        except Exception:
            res = client.models.generate_content(
                model=model_id,
                contents="In one concise sentence, what is the role of insulin?"
            )
            out = res.text

        if out and len(out.strip()) > 0:
            print("Gemini request: SUCCESS", flush=True)
            return 0
        else:
            print("Gemini request: FAILED", flush=True)
            return 1
    except Exception as exc:
        err_msg = str(exc)
        if any(k in err_msg for k in ("429", "RESOURCE_EXHAUSTED", "Quota")):
            print("Gemini request: FAILED (429 RATE_LIMITED / QUOTA_EXHAUSTED)", flush=True)
        elif "503" in err_msg or "UNAVAILABLE" in err_msg:
            print("Gemini request: FAILED (503 TEMPORARILY_UNAVAILABLE)", flush=True)
        else:
            print("Gemini request: FAILED", flush=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
