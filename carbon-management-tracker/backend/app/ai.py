import os
from pathlib import Path
from dotenv import load_dotenv  # reads your env file
import httpx
from google import genai
from google.genai import errors, types

# .env is in backend, it's just hidden
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found. Check backend/.env")

client = genai.Client(api_key=api_key)

# Lite answers these short prompts in about a second; the full Flash models
# were often overloaded and took 20s+ or timed out
MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
# Tried in order when the one before is overloaded, out of quota or too slow
FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"]


def ask_gemini(prompt: str, as_json: bool = False) -> str:
    config = types.GenerateContentConfig(
        # These are short prompts, so skip most of the model's thinking: it was most of the wait
        thinking_config=types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW),
        # as_json forces Gemini to reply with valid JSON only, no extra text
        response_mime_type="application/json" if as_json else None,
        # ms; a slow model moves on to the next one instead of hanging the app
        http_options=types.HttpOptions(timeout=10_000),
    )
    models = [MODEL, *(m for m in FALLBACK_MODELS if m != MODEL)]
    for i, model in enumerate(models):
        try:
            response = client.models.generate_content(model=model, contents=prompt, config=config)
            break
        except (errors.APIError, httpx.TimeoutException) as e:
            busy = isinstance(e, httpx.TimeoutException) or e.code in (429, 503, 504)
            if not busy or i == len(models) - 1:
                raise
    if not response.text:
        raise RuntimeError("Gemini returned an empty reply (it may have been blocked)")
    return response.text