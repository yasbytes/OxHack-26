import os
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.db import User, current_user
from app.projections import monthly_net_worth, compare_years
from app.ai import ask_gemini, parse_activities
from app.calculator import log_entry

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
    prompt: str = Field(min_length=1, max_length=2000)


@app.post("/api/ask")
def ask(body: AskBody, user: User = Depends(current_user)):
    return {"text": ask_gemini(body.prompt)}


class ParseLogBody(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@app.post("/api/parse-log")
def parse_log(body: ParseLogBody, user: User = Depends(current_user)):
    """
    Reads a quick log ("cycled 5 km to work, then a beef burger for lunch") into
    log entries with kg worked out from factors.py. The browser saves them.
    """
    try:
        activities = parse_activities(body.text)
    except Exception as error:
        raise HTTPException(502, "Couldn't read that right now") from error
    entries = [e for e in (log_entry(a) for a in activities) if e]
    return {"entries": entries}
