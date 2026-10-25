import os
from pathlib import Path
import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# What the cat says in each mood (ids from MOODS in src/pet.ts, which shows the same lines)
CAT_LINES = {
    "thriving": "Thank you for saving the planet!",
    "okay": "You're doing the bare minimum but thank you!",
    "worried": "I don't feel too good",
    "miserable": "Please don't kill me",
}

# Any voice from your ElevenLabs voice library; this default is one of their premade voices
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID") or "21m00Tcm4TlvDq8ikWAM"
MODEL = os.getenv("ELEVENLABS_MODEL") or "eleven_multilingual_v2"

# The lines never change, so each is only generated once and then served from here
CACHE = Path(__file__).resolve().parent.parent / "voice_cache"


def cat_voice(mood: str) -> Path:
    """An mp3 of the cat saying its line for this mood."""
    line = CAT_LINES[mood]
    path = CACHE / f"{VOICE_ID}-{mood}.mp3"
    if path.exists():
        return path

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found. Check backend/.env")
    response = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": api_key},
        params={"output_format": "mp3_44100_128"},
        json={"text": line, "model_id": MODEL},
        timeout=30,
    )
    response.raise_for_status()
    CACHE.mkdir(exist_ok=True)
    path.write_bytes(response.content)
    return path
