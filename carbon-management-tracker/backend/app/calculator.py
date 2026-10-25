"""
Turns log entries into kg CO2e and runs the budget, coin and pet-mood rules.

Formula for every entry: kg CO2e = activity data x emission factor.
All numbers come from factors.py. Everything here is a pure function, so it is
easy to test and to call from FastAPI routes.

Gemini is never used to produce a carbon number. Free text ("quick" entries and
the energy "describe" method) must be turned into structured fields first, then
passed through calculate_entry like any other entry.
"""
from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from typing import Any, Mapping, Optional

from . import factors as F


# --------------------------------------------------------------------------
# Result type
# --------------------------------------------------------------------------
@dataclass
class CalcResult:
    kg: Optional[float]        # None = could not calculate
    spread_days: int = 1       # bills: days covered, ending on the entry date
    note: Optional[str] = None # assumptions made or the reason kg is None


def _num(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------
# Travel
# --------------------------------------------------------------------------
def calc_travel(p: Mapping[str, Any]) -> CalcResult:
    mode = p.get("mode")

    if mode == "car":
        distance = _num(p.get("distance"))
        if distance is None or distance <= 0:
            return CalcResult(None, note="car trip needs a distance")
        km = distance * (F.MI_TO_KM if p.get("unit") == "mi" else 1.0)
        fuel = p.get("fuelType") or "Petrol"
        factor = F.CAR_KG_PER_KM.get(fuel)
        if factor is None:
            return CalcResult(None, note=f"unknown fuel type: {fuel}")
        return CalcResult(round(km * factor, 3))

    factor = F.TRANSPORT_KG_PER_PASSENGER_KM.get(mode)
    if factor is None:
        return CalcResult(None, note=f"unknown travel mode: {mode}")
    if factor == 0:
        return CalcResult(0.0)  # walking and cycling

    # Non-car trips only have an origin and destination. A future geocoding step
    # can pass the real distance as "distanceKm"; until then use a typical trip.
    km = _num(p.get("distanceKm"))
    note = None
    if km is None:
        km = float(F.DEFAULT_TRIP_KM[mode])
        note = f"assumed a typical {mode} trip of {km:g} km"
    return CalcResult(round(km * factor, 3), note=note)


# --------------------------------------------------------------------------
# Home energy
# --------------------------------------------------------------------------
def _to_kwh(fuel: str, amount: float, unit: str) -> Optional[float]:
    if unit == "kWh":
        return amount
    if unit == "£":
        return amount / F.GBP_PER_KWH[fuel]
    if unit == "m³" and fuel == "gas":
        return amount * F.M3_GAS_TO_KWH
    if unit == "litres" and fuel in ("oil", "lpg"):
        return amount * F.LITRE_LIQUID_TO_KWH
    return None


def _bedrooms(value: Any) -> int:
    match = re.search(r"\d", str(value or ""))
    beds = int(match.group()) if match else F.DEFAULT_BEDROOMS
    return min(max(beds, min(F.BEDROOM_SCALE)), max(F.BEDROOM_SCALE))


def _heating_fuel(text: Any) -> str:
    lowered = str(text or "").lower()
    for keyword, fuel in F.HEATING_KEYWORDS:
        if keyword in lowered:
            return fuel
    return F.DEFAULT_HEATING


def calc_energy(p: Mapping[str, Any]) -> CalcResult:
    method = p.get("method")

    if method == "bill":
        fuel = p.get("fuel")
        amount = _num(p.get("amount"))
        if fuel not in F.KG_PER_KWH or amount is None or amount < 0:
            return CalcResult(None, note="bill needs a fuel and an amount")
        kwh = _to_kwh(fuel, amount, p.get("unit"))
        if kwh is None:
            return CalcResult(None, note=f"unit {p.get('unit')} does not fit {fuel}")
        occupants = max(1, int(_num(p.get("occupants")) or 1))
        kg = kwh * F.KG_PER_KWH[fuel] / occupants  # this person's share of the household
        days = F.PERIOD_DAYS.get(p.get("period"), 30)
        return CalcResult(round(kg, 3), spread_days=days)

    if method == "estimate":
        occupants = max(1, int(_num(p.get("occupants")) or 1))
        scale = F.BEDROOM_SCALE[_bedrooms(p.get("bedrooms"))]
        typical = F.TYPICAL_HOME_KWH_PER_YEAR
        heating_fuel = _heating_fuel(p.get("heating"))

        kg_year = typical["electricity"] * F.KG_PER_KWH["electricity"]
        if heating_fuel == "heat_pump":
            kg_year += typical["heating"] / F.HEAT_PUMP_COP * F.KG_PER_KWH["electricity"]
        else:
            kg_year += typical["heating"] * F.KG_PER_KWH[heating_fuel]

        # One day's share for one person. The entry covers a single day.
        kg_day = kg_year * scale / occupants / 365
        return CalcResult(round(kg_day, 3), note="estimated from typical home energy use")

    # "describe" is free text: Gemini must extract fuel, amount and period first.
    return CalcResult(None, note="free text: parse into a bill entry first")


# --------------------------------------------------------------------------
# Food
# --------------------------------------------------------------------------
def calc_food(p: Mapping[str, Any]) -> CalcResult:
    per_serving = F.FOOD_KG_PER_SERVING.get(p.get("category"))
    if per_serving is None:
        return CalcResult(None, note=f"unknown food category: {p.get('category')}")
    meal = F.MEAL_MULTIPLIER.get(p.get("mealType"), 1.0)
    servings = _num(p.get("servings")) or 1.0
    return CalcResult(round(per_serving * meal * servings, 3))


# --------------------------------------------------------------------------
# Entry point used by POST /entries
# --------------------------------------------------------------------------
def calculate_entry(kind: str, payload: Mapping[str, Any]) -> CalcResult:
    if kind == "travel":
        return calc_travel(payload)
    if kind == "energy":
        return calc_energy(payload)
    if kind == "food":
        return calc_food(payload)
    # "quick" entries are split into structured entries by Gemini before this.
    return CalcResult(None, note=f"cannot calculate kind: {kind}")


# --------------------------------------------------------------------------
# Budgets (UK only). The user's reduction can never go below the 20% floor.
# --------------------------------------------------------------------------
def clamp_reduction(reduction: float) -> float:
    return min(F.MAX_REDUCTION, max(F.MIN_REDUCTION, reduction))


def monthly_budget_kg(reduction: float = F.MIN_REDUCTION) -> float:
    return F.ANNUAL_BASE_KG * (1 - clamp_reduction(reduction)) / 12


def daily_budget_kg(year: int, month: int, reduction: float = F.MIN_REDUCTION) -> float:
    return monthly_budget_kg(reduction) / calendar.monthrange(year, month)[1]


def weekly_budget_kg() -> float:
    """Used for pet mood. Always the 20% floor, so a stricter personal target
    never makes the cat unhappy."""
    return F.ANNUAL_BASE_KG * (1 - F.MIN_REDUCTION) / 52


# --------------------------------------------------------------------------
# Coins
# --------------------------------------------------------------------------
def multiplier(reduction: float) -> float:
    """1.0 at the 20% floor, rising with a stricter personal target."""
    return 1 + (clamp_reduction(reduction) - F.MIN_REDUCTION) * F.STRETCH_MULTIPLIER_SLOPE


def coins_for_day(day_kg: float, daily_budget: float, reduction: float, logged: bool) -> int:
    """Coins for one day. Zero if the day was not logged or the budget was missed.
    Never negative: missing the budget costs nothing but earns nothing."""
    if not logged or day_kg >= daily_budget:
        return 0
    m = multiplier(reduction)
    raw = (daily_budget - day_kg) * F.COINS_PER_KG * m
    return min(round(F.BASE_MAX_COINS_PER_DAY * m), round(raw))


def month_bonus(month_kg: float, budget: float, days_logged: int,
                days_in_month: int, reduction: float) -> int:
    """Bonus for finishing the month at or under budget. Requires most days to be
    logged so that skipping the app cannot win it."""
    if days_logged >= F.MIN_LOGGED_DAYS_SHARE * days_in_month and month_kg <= budget:
        return round(F.BASE_MONTH_BONUS * multiplier(reduction))
    return 0


# --------------------------------------------------------------------------
# Pet mood (rolling week, so the cat recovers after a few good days)
# --------------------------------------------------------------------------
def pet_mood(week_kg: float) -> str:
    ratio = week_kg / weekly_budget_kg()
    for limit, mood in F.PET_MOOD_THRESHOLDS:
        if ratio < limit:
            return mood
    return F.PET_MOOD_WORST