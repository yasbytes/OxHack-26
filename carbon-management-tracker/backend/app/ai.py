import os 
from pathlib import Path
from dotenv import load_dotenv #reads your env file.
from google import genai

# .env is in backend it's just hidden rn 
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found. Check backend/.env")

client = genai.Client(api_key=api_key)

def ask_gemini(prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=prompt,
    )
    return response.text


#to use this ex.
#from app.ai import ask_gemini
#answer = ask_gemini("How can I reduce my carbon footprint?")