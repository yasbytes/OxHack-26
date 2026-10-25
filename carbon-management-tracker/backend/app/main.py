from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.db import supabase
from app.projections import monthly_net_worth, compare_years
from app.ai import ask_gemini
from app.journey import plan_journey
#I changed Imports HTTPException and plan_journey,
# allows port 5174 as well as 5173, so the browser doesn’t block requests from your app.
# Adds the /api/journey endpoint at the bottom
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/net-worth")
def net_worth(year: int | None = None):
    rows = supabase.table("entries").select("*").execute().data
    return monthly_net_worth(rows, year)

@app.get("/api/compare")
def compare():
    rows = supabase.table("entries").select("*").execute().data
    return compare_years(rows)

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