import os
from pathlib import Path
from dotenv import dotenv_values, load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / '.env')


class ConfigurationError(RuntimeError):
    pass


def supabase_settings() -> tuple[str, str]:
    # Reuse the browser's public connection settings in local development.
    frontend = dotenv_values(BACKEND_DIR.parent / '.env.local')
    url = os.getenv('SUPABASE_URL') or frontend.get('VITE_SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY') or next((frontend.get(name) for name in (
        'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY'
    ) if frontend.get(name)), None)
    if not url or not key:
        raise ConfigurationError('Set SUPABASE_URL and SUPABASE_KEY in backend/.env, then restart the backend.')
    return url, key
