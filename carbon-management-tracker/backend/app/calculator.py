"""
kg CO2e for activities read from free text. Uses the same factors as the
front end's forms (src/estimates.ts), so a quick log and a form entry agree.
"""

from app import factors

TRAVEL_LABELS = {
    "car": "Car",
    "bus": "Bus",
    "train": "Train",
    "flight": "Flight",
    "walk": "Walk",
    "bicycle": "Bicycle",
}

FOOD_LABELS = {
    "beef": "Beef",
    "lamb": "Lamb",
    "other_meat": "Other meat",
    "fish": "Fish",
    "vegetarian": "Vegetarian",
    "vegan": "Vegan",
    "not_sure": "Not sure",
}


def travel_kg(mode: str, distance_km: float, fuel_type: str | None = None) -> float:
    if mode == "car":
        per_km = factors.CAR_KG_PER_KM.get(fuel_type or "Petrol", factors.CAR_KG_PER_KM["Petrol"])
    else:
        per_km = factors.TRANSPORT_KG_PER_PASSENGER_KM.get(mode, 0.0)
    return max(distance_km, 0.0) * per_km


def food_kg(category: str, meal_type: str, servings: float) -> float:
    per_serving = factors.FOOD_KG_PER_SERVING.get(category, factors.FOOD_KG_PER_SERVING["not_sure"])
    return per_serving * factors.MEAL_MULTIPLIER.get(meal_type, 1.0) * max(servings, 0.0)


def log_entry(activity: dict) -> dict | None:
    """
    Turn one activity Gemini read from the text into a log entry shaped like the
    front end's forms make them. Returns None for anything it can't work out.
    """
    kind = activity.get("kind")
    note = (activity.get("description") or "").strip()

    if kind == "travel" and activity.get("mode") in TRAVEL_LABELS:
        mode = activity["mode"]
        km = float(activity.get("distance_km") or factors.DEFAULT_TRIP_KM.get(mode, 0))
        fuel = activity.get("fuel_type") if activity.get("fuel_type") in factors.CAR_KG_PER_KM else "Petrol"
        label = TRAVEL_LABELS[mode]
        return {
            "kind": "travel",
            "title": f"{label} ({fuel})" if mode == "car" else label,
            "detail": " · ".join(filter(None, [f"{round(km, 1):g} km", note])),
            "kg": round(travel_kg(mode, km, fuel), 3),
        }

    if kind == "food" and activity.get("food_category") in FOOD_LABELS:
        meal = activity.get("meal_type") if activity.get("meal_type") in factors.MEAL_MULTIPLIER else "Lunch"
        servings = float(activity.get("servings") or 1)
        return {
            "kind": "food",
            "title": f"{meal}: {FOOD_LABELS[activity['food_category']]}",
            "detail": " · ".join(filter(None, [f"{servings:g} serving{'s' if servings != 1 else ''}", note])),
            "kg": round(food_kg(activity["food_category"], meal, servings), 3),
        }

    return None
