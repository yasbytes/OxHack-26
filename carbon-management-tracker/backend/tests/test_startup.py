import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.ai import get_client
from app.settings import ConfigurationError, supabase_settings


class StartupTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        get_client.cache_clear()

    def tearDown(self):
        get_client.cache_clear()

    def test_server_and_docs_work_without_gemini(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            self.assertEqual(self.client.get('/api/health').json(), {'status': 'ok'})
            self.assertEqual(self.client.get('/docs').status_code, 200)
            response = self.client.post('/api/journey', json={'question': 'Train to London?'})
            self.assertEqual(response.status_code, 503)
            self.assertIn('backend/.env', response.json()['detail'])

    def test_empty_prompts_are_rejected_before_calling_gemini(self):
        with patch('app.main.ask_gemini') as gemini:
            self.assertEqual(self.client.post('/api/ask', json={'prompt': '   '}).status_code, 422)
            gemini.assert_not_called()

    def test_ask_success_and_provider_failure(self):
        with patch('app.main.ask_gemini', return_value='Try taking the train.'):
            response = self.client.post('/api/ask', json={'prompt': 'How can I save carbon?'})
            self.assertEqual(response.json(), {'text': 'Try taking the train.'})
        with patch('app.main.ask_gemini', side_effect=RuntimeError('private provider details')):
            response = self.client.post('/api/ask', json={'prompt': 'Help'})
            self.assertEqual(response.status_code, 502)
            self.assertNotIn('private provider details', response.text)

    def test_protected_data_rejects_missing_or_malformed_tokens(self):
        with patch('app.db.get_supabase') as database:
            for header in ['', 'Bearer ', 'Basic example']:
                response = self.client.get('/api/net-worth', headers={'Authorization': header})
                self.assertEqual(response.status_code, 401)
            database.assert_not_called()

    def test_provider_overload_has_a_retry_message(self):
        error = RuntimeError('provider overloaded')
        error.code = 503
        with patch('app.main.plan_journey', side_effect=error):
            response = self.client.post('/api/journey', json={'question': 'Train to London?'})
            self.assertEqual(response.status_code, 503)
            self.assertIn('busy', response.json()['detail'])

    def test_supabase_reuses_frontend_public_config(self):
        with patch.dict(os.environ, {}, clear=True), patch('app.settings.dotenv_values', return_value={
            'VITE_SUPABASE_URL': 'https://example.supabase.co',
            'VITE_SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_example',
        }):
            self.assertEqual(supabase_settings(), ('https://example.supabase.co', 'sb_publishable_example'))
        with patch.dict(os.environ, {}, clear=True), patch('app.settings.dotenv_values', return_value={}):
            with self.assertRaises(ConfigurationError):
                supabase_settings()


if __name__ == '__main__':
    unittest.main()
