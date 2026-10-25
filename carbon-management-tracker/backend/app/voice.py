"""
Makes the cat's voice lines with ElevenLabs. They never change, so they're
saved into the front end (src/assets/pet/voice) and the app plays them from
there without the backend. Run again only after changing a line or the voice:

    cd backend
    python -m app.voice
"""

import os
from pathlib import Path
import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# What the cat says in each mood (ids from MOODS in src/pet.ts, which shows the
# same lines). A collapsed cat has nothing to say.
CAT_LINES = {
    "thriving": "Thank you for saving the planet!",
    "okay": "You're doing the bare minimum but thank you!",
    "worried": "I don't feel too good",
    "miserable": "Please don't kill me",
}

# Any voice from your ElevenLabs voice library; this default is one of their premade voices
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID") or "21m00Tcm4TlvDq8ikWAM"
MODEL = os.getenv("ELEVENLABS_MODEL") or "eleven_multilingual_v2"

OUT = Path(__file__).resolve().parents[2] / "src" / "assets" / "pet" / "voice"


def make_line(mood: str, api_key: str) -> Path:
    response = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": api_key},
        params={"output_format": "mp3_44100_128"},
        json={"text": CAT_LINES[mood], "model_id": MODEL},
        timeout=30,
    )
    response.raise_for_status()
    path = OUT / f"{mood}.mp3"
    path.write_bytes(response.content)
    return path


if __name__ == "__main__":
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise SystemExit("ELEVENLABS_API_KEY not found. Check backend/.env")
    OUT.mkdir(parents=True, exist_ok=True)
    for mood in CAT_LINES:
        print("Saved", make_line(mood, api_key))
