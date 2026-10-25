import os
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.db import User, current_user
from app.projections import monthly_net_worth, compare_years
from app.ai import ask_gemini
from app.journey import plan_journey
from app.voice import CAT_LINES, cat_voice

app = FastAPI()

# In development Vite proxies /api, so this only matters when the front end is
# served from another origin. Comma-separated, e.g. https://futureearth.app
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def _entries(user: User) -> list[dict]:
    """The user's log in the shape projections.py expects. Row level security keeps it to them."""
    rows = user.client().table("log_items").select("date, kg").not_.is_("kg", "null").execute().data
    return [{"date": r["date"], "type": "emission", "kg_co2e": r["kg"]} for r in rows]


@app.get("/api/net-worth")
def net_worth(year: int | None = None, user: User = Depends(current_user)):
    return monthly_net_worth(_entries(user), year)


@app.get("/api/compare")
def compare(user: User = Depends(current_user)):
    return compare_years(_entries(user))


class AskBody(BaseModel):
    prompt: str

@app.post("/api/ask")
def ask(body: AskBody):
    return {"text": ask_gemini(body.prompt)}


class JourneyBody(BaseModel):
    question: str

@app.post("/api/journey")
def journey(body: JourneyBody):
    try:
        return plan_journey(body.question)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't plan that journey: {e}")


@app.get("/api/cat-voice/{mood}")
def cat_voice_line(mood: str):
    if mood not in CAT_LINES:
        raise HTTPException(status_code=404, detail="No line for that mood")
    try:
        return FileResponse(cat_voice(mood), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't make the cat's voice: {e}")
