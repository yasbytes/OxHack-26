import json
import re
#this is so that ai gemini or like he user asks for advice or smthing
from app.ai import ask_gemini

#to try it out 
#1. uvicorn app.main;app --reload 
#2. make sure number 1 is installed in ur environment 
#3.http://localhost:8000/docs 
#4. go to journey and click try it out 
#Approximate kg CO2e per passenger-km. Your backend already has factors.py, so
FACTORS = {
    "car": 0.17,
    "coach": 0.03,
    "train": 0.035,
    "flight": 0.25,
    "bike_or_walk": 0.0,
}
LABELS = {
    "car": "Car",
    "coach": "Bus / coach",
    "train": "Train",
    "flight": "Flight",
    "bike_or_walk": "Walk / bike",
}

EXTRACT_PROMPT = """Read this travel question and reply with ONLY a JSON object, no other text:
{{"origin": string, "destination": string, "distance_km": number, "mode": "car"|"coach"|"train"|"flight"|"bike_or_walk"|null}}
distance_km is a rough one-way travel distance. mode is the transport they mention, or null if none.
If it isn't a journey question, reply {{"error": "not a journey"}}.
Question: {question}"""

#an estimate of the distance 
ADVICE_PROMPT = """A user asked: "{question}"
Journey: {origin} to {destination}, about {distance:.0f} km one way.
Emissions per option (kg CO2e): {options}.
They are considering: {chosen}. Compared with going by car, that {verdict}.
Write 2-3 friendly sentences of advice. Use ONLY the numbers above, do not invent others."""

#carbon foootprint :)
GENERAL_PROMPT = """You are a friendly carbon footprint assistant inside a personal carbon tracker.
Answer in 3-4 short sentences. If you give numbers, say they are rough estimates.
If the question has nothing to do with carbon, travel, energy, food or sustainability, politely say you can only help with those.
Question: {question}"""

def _parse_json(text: str) -> dict:
    text = re.sub(r"```json|```", "", text).strip()
    return json.loads(text)


def plan_journey(question: str) -> dict:
    info = _parse_json(ask_gemini(EXTRACT_PROMPT.format(question=question), as_json=True))
    if "error" in info:
        answer = ask_gemini(GENERAL_PROMPT.format(question=question))
        return {"kind": "general", "advice": answer.strip()}

    km = float(info["distance_km"])
    options = {}
    for mode, factor in FACTORS.items():
        if mode == "flight" and km < 150:
            continue  # nobody flies this far
        if mode == "bike_or_walk" and km > 30:
            continue
        options[mode] = round(km * factor, 1)

    chosen = info.get("mode") if info.get("mode") in options else "train"
    saved = round(options["car"] - options[chosen], 1)
    verdict = (
        f"saves about {saved} kg" if saved > 0
        else f"adds about {abs(saved)} kg" if saved < 0
        else "makes no difference"
    )

    advice = ask_gemini(ADVICE_PROMPT.format(
        question=question, origin=info["origin"], destination=info["destination"],
        distance=km,
        options=", ".join(f"{LABELS[m]} {kg}" for m, kg in options.items()),
        chosen=LABELS[chosen], verdict=verdict,
    ))

    return {
        "kind": "journey",
        "origin": info["origin"],
        "destination": info["destination"],
        "distance_km": round(km),
        "options": [{"mode": m, "label": LABELS[m], "kg": kg} for m, kg in options.items()],
        "chosen": chosen,
        "saved_kg": saved,  # positive = saves vs car, negative = wastes
        "advice": advice.strip(),
    }