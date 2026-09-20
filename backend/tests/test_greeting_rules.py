"""
backend/tests/test_greeting_rules.py - Tests for time-aware greeting boundary logic.

Boundaries:
  05:00 - 11:59 -> Good morning
  12:00 - 16:59 -> Good afternoon
  17:00 - 20:59 -> Good evening
  21:00 - 04:59 -> Good night
"""

def get_time_aware_greeting(hour: int, user_name: str = None) -> str:
    """Calculates time-aware greeting based on hour (0-23) and optional user name."""
    if 5 <= hour < 12:
        greeting = "Good morning"
    elif 12 <= hour < 17:
        greeting = "Good afternoon"
    elif 17 <= hour < 21:
        greeting = "Good evening"
    else:
        greeting = "Good night"

    if user_name and user_name.strip():
        return f"{greeting}, {user_name.strip()}"
    return greeting

def test_greeting_time_boundaries():
    # Morning: 05:00 to 11:59
    assert get_time_aware_greeting(5) == "Good morning"
    assert get_time_aware_greeting(6) == "Good morning"
    assert get_time_aware_greeting(11) == "Good morning"

    # Afternoon: 12:00 to 16:59
    assert get_time_aware_greeting(12) == "Good afternoon"
    assert get_time_aware_greeting(14) == "Good afternoon"
    assert get_time_aware_greeting(16) == "Good afternoon"

    # Evening: 17:00 to 20:59
    assert get_time_aware_greeting(17) == "Good evening"
    assert get_time_aware_greeting(19) == "Good evening"
    assert get_time_aware_greeting(20) == "Good evening"

    # Night: 21:00 to 04:59
    assert get_time_aware_greeting(21) == "Good night"
    assert get_time_aware_greeting(23) == "Good night"
    assert get_time_aware_greeting(0) == "Good night"
    assert get_time_aware_greeting(3) == "Good night"
    assert get_time_aware_greeting(4) == "Good night"

def test_greeting_with_user_name():
    assert get_time_aware_greeting(9, "Abhijit") == "Good morning, Abhijit"
    assert get_time_aware_greeting(14, "Abhijit") == "Good afternoon, Abhijit"
    assert get_time_aware_greeting(18, "Abhijit") == "Good evening, Abhijit"
    assert get_time_aware_greeting(22, "Abhijit") == "Good night, Abhijit"
