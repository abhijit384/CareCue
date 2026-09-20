"""
backend/handlers package - AWS Lambda request routers and handlers.
"""

import sys
import types
from pathlib import Path

# Ensure 'backend' namespace is resolvable whether running from repo root or Lambda task root (/var/task)
_backend_dir = Path(__file__).resolve().parent.parent
if "backend" not in sys.modules:
    _backend_mod = types.ModuleType("backend")
    _backend_mod.__path__ = [str(_backend_dir)]
    sys.modules["backend"] = _backend_mod
