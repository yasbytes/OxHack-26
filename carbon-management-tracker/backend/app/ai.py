import os
from pathlib import Path
from dotenv import load_dotenv  # reads your env file
from google import genai
from google.genai import types

# .env is in backend, it's just hidden
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found. Check backend/.env")

client = genai.Client(api_key=api_key)

MODEL = "gemini-3.8-flash"


def ask_gemini(prompt: str, as_json: bool = False) -> str:
    # as_json forces Gemini to reply with valid JSON only, no extra text
    config = types.GenerateContentConfig(response_mime_type="application/json") if as_json else None
    response = client.models.generate_content(model=MODEL, contents=prompt, config=config)
    if not response.text:
        raise RuntimeError("Gemini returned an empty reply (it may have been blocked)")
    return response.text