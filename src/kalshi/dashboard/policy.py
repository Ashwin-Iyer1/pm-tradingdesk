"""Local dashboard policy. This is not authentication for a public deployment."""
import os

LOCAL_ORIGINS = ('http://localhost:8000', 'http://127.0.0.1:8000', 'http://[::1]:8000')
EXECUTION_ACTIONS = frozenset({'place_order', 'cancel_order', 'start_hotkey_bot', 'bot_execute_hotkey', 'generate_hotkeys'})


def trading_enabled():
    return os.environ.get('DASHBOARD_ENABLE_EXECUTION', '').lower() == 'true'


def action_allowed(action):
    return action not in EXECUTION_ACTIONS or trading_enabled()


def origin_allowed(origin):
    return origin in LOCAL_ORIGINS
