import os 
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# .env is in backend/, one folder above app/
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found. Check backend/.env")

client = genai.Client(api_key=api_key)

def ask_gemini(prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-2.5-flash",  # check AI Studio for the current model name
        contents=prompt,
    )
    return response.text