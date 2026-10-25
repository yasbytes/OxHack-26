#database
#pip install supabase
# The backend uses the same public (anon/publishable) key as the browser and
# acts as the signed-in user, so row level security still decides what it sees.

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Header, HTTPException
from supabase import Client, create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_KEY missing. Check backend/.env")

supabase = create_client(url, key)


class User:
    def __init__(self, id: str, token: str):
        self.id = id
        self.token = token

    def client(self) -> Client:
        """A client that queries the database as this user."""
        client = create_client(url, key)
        client.postgrest.auth(self.token)
        return client


def current_user(authorization: str | None = Header(default=None)) -> User:
    """FastAPI dependency: the user whose Supabase access token came with the request."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Log in first")
    token = authorization.split(" ", 1)[1]
    try:
        user = supabase.auth.get_user(token).user
    except Exception:
        user = None
    if user is None:
        raise HTTPException(401, "Your login has expired. Log in again.")
    return User(user.id, token)
