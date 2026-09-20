"""
backend/handlers/tts_handler.py - AWS Lambda handler for Text-to-Speech audio streaming.
Supports Indian regional and international languages via native audio stream proxy.
"""

import re
import json
import base64
import urllib.request
import urllib.parse
from typing import Dict, Any

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Session-Id",
}

def _response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body),
    }

def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")

    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": "",
        }

    # Extract text and lang from query string or body
    query_params = event.get("queryStringParameters") or {}
    text = query_params.get("text")
    lang = query_params.get("lang", "en")

    if not text:
        try:
            body_str = event.get("body", "{}")
            payload = json.loads(body_str) if isinstance(body_str, str) else body_str
            text = payload.get("text")
            lang = payload.get("lang") or lang
        except Exception:
            pass

    if not text or not text.strip():
        return _response(400, {"error": "Parameter 'text' is required"})

    # Clean text of markdown, slashes, and symbols that cause TTS to pronounce "slash slash"
    clean_text = re.sub(r'[*#_`~]', '', text)
    clean_text = re.sub(r'(\d+)/(\d+)', r'\1 \2', clean_text)
    clean_text = re.sub(r'[\/\\]+', ' ', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    q_text = clean_text[:200]
    lang_code = lang.lower().split("-")[0].split("_")[0]

    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang_code}&client=tw-ob&q={urllib.parse.quote(q_text)}"

    try:
        req = urllib.request.Request(tts_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            audio_bytes = resp.read()
            return {
                "statusCode": 200,
                "headers": {
                    **CORS_HEADERS,
                    "Content-Type": "audio/mpeg",
                    "Cache-Control": "public, max-age=86400",
                },
                "body": base64.b64encode(audio_bytes).decode('utf-8'),
                "isBase64Encoded": True,
            }
    except Exception as e:
        return _response(502, {"error": f"TTS stream generation error: {e}"})
