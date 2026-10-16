import asyncio
import json
import os
import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from src.kalshi.dashboard import web_server as server
from src.kalshi.dashboard.policy import action_allowed, origin_allowed


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'DASHBOARD_ENABLE_EXECUTION': 'false'})
        self.env.start()
        self.client = TestClient(server.app, base_url='http://localhost:8000')
        server.connection_manager = server.ConnectionManager()

    def tearDown(self):
        self.client.close()
        self.env.stop()

    def test_foreign_and_missing_origins_rejected(self):
        for origin in ['https://attacker.invalid', 'null', None]:
            self.assertFalse(origin_allowed(origin))
            with self.assertRaises(WebSocketDisconnect):
                with self.client.websocket_connect('ws://localhost:8000/ws', headers={'origin': origin} if origin else {}): pass

    def test_hostname_rebinding_blocked(self):
        self.assertEqual(self.client.get('/api/health', headers={'host': 'attacker.invalid'}).status_code, 400)

    def test_empty_fills_returns_empty_list(self):
        fake = AsyncMock()
        fake.get_fills.return_value = {'fills': []}
        with patch.object(server, 'kalshi_client', fake):
            with self.client.websocket_connect('ws://localhost:8000/ws', headers={'origin': 'http://localhost:8000'}) as ws:
                self.assertFalse(ws.receive_json()['execution_enabled'])
                ws.send_json({'action': 'get_fills'})
                self.assertEqual(ws.receive_json(), {'type': 'fills', 'fills': []})

    def test_disabled_execution_never_calls_broker(self):
        fake = AsyncMock()
        with patch.object(server, 'kalshi_client', fake):
            with self.client.websocket_connect('ws://localhost:8000/ws', headers={'origin': 'http://localhost:8000'}) as ws:
                ws.receive_json()
                for action in ['place_order', 'cancel_order', 'start_hotkey_bot', 'bot_execute_hotkey', 'generate_hotkeys']:
                    ws.send_json({'action': action})
                    self.assertIn('Read-only', ws.receive_json()['message'])
        fake.place_order.assert_not_called()
        fake.cancel_order.assert_not_called()

    def test_opt_in_is_explicit_but_stop_is_always_available(self):
        self.assertTrue(action_allowed('stop_hotkey_bot'))
        with patch.dict(os.environ, {'DASHBOARD_ENABLE_EXECUTION': 'true'}):
            self.assertTrue(action_allowed('place_order'))

    def test_disconnect_during_broadcast_does_not_mutate_iteration(self):
        async def run():
            manager = server.ConnectionManager()
            a, b = AsyncMock(), AsyncMock()
            await manager.connect(a)
            await manager.connect(b)
            a.send_text.side_effect = RuntimeError('closed')
            a.send_bytes.side_effect = RuntimeError('closed')
            await manager.broadcast_json({'x': 1})
            self.assertNotIn(a, manager.active_connections)
            self.assertIn(b, manager.active_connections)
        asyncio.run(run())


if __name__ == '__main__': unittest.main()
