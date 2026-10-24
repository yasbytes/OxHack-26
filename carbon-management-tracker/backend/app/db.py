#database
#pip install supabase
#copy this code and test the sql table
#python -c "from app.db import supabase; print(supabase.table('entries').select('*').limit(1).execute())"

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_KEY missing. Check backend/.env")

supabase = create_client(url, key)

