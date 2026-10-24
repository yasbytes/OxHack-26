from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.db import supabase
from app.projections import monthly_net_worth, compare_years
from app.ai import ask_gemini

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
