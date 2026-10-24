"""
Emission factors and budget constants. Every number the calculator uses lives here.

UK only. Entries are measured as: kg CO2e = activity data x emission factor.

Sources to cite in the app:
- Budget base: Defra, "Carbon footprint for the UK and England to 2023"
  (published 30 Jun 2026, updated 24 Jul 2026), figures and tables dataset,
  Table_1, Table_2 and Figure_2. Produced by the University of Leeds.
- Travel and energy: UK Government GHG Conversion Factors for company
  reporting 2026 (DESNZ/Defra, published 11 Jun 2026).
- Food: Poore & Nemecek (2018) via Our World in Data, converted to per-serving.

Comments say VERIFY where a value is carried over from the front end or taken
from a secondary site and has not been checked against the official workbook.
Comments say ASSUMPTION where the number is a placeholder judgement call.
"""

# --------------------------------------------------------------------------
# Budget (UK only)
# --------------------------------------------------------------------------
MIN_REDUCTION = 0.20   # everyone must aim for at least 20% below the average
MAX_REDUCTION = 0.90

# Defra consumption-based footprint (all greenhouse gases), 2023, kt CO2e.
UK_FOOTPRINT_KT = 699_202          # Table_1, Total
UK_PER_PERSON_T = 10.2034          # Figure_2, 2023 (the release rounds this to 10)

# Table_2 household categories that match the app's three forms.
TRACKED_KT = (
    150_436      # Transportation
    + 113_467    # Electricity, gas and other fuels
    + 74_732     # Food and non-alcoholic beverages
    + 36_734     # Restaurants and hotels (meals out; also covers hotels, which we don't track)
)

# Population implied by Defra's own total and per-person figures (~68.5 million).
UK_POPULATION_M = UK_FOOTPRINT_KT / UK_PER_PERSON_T / 1000

TRACKED_SHARE = TRACKED_KT / UK_FOOTPRINT_KT    # ~0.54
ANNUAL_BASE_KG = TRACKED_KT / UK_POPULATION_M   # kt per million people = kg per person (~5,480)

# --------------------------------------------------------------------------
# Rewards
# --------------------------------------------------------------------------
COINS_PER_KG = 5                 # coins per kg saved below the daily budget (tune after playtesting)
BASE_MAX_COINS_PER_DAY = 30      # daily cap at the 20% target
BASE_MONTH_BONUS = 100           # month-end bonus at the 20% target
STRETCH_MULTIPLIER_SLOPE = 2     # multiplier = 1 + (reduction - 0.20) * slope
MIN_LOGGED_DAYS_SHARE = 0.8      # share of days that must be logged for the bonus

# --------------------------------------------------------------------------
# Pet mood: this week's kg divided by the weekly budget (at the 20% floor)
# --------------------------------------------------------------------------
PET_MOOD_THRESHOLDS = [
    (0.75, "thriving"),
    (1.00, "okay"),
    (1.30, "worried"),
    (1.75, "miserable"),
]
PET_MOOD_WORST = "sick"

# --------------------------------------------------------------------------
# Home energy
# --------------------------------------------------------------------------
KG_PER_KWH = {
    "electricity": 0.131,   # DESNZ 2026 UK grid average, down from 0.177. VERIFY in the workbook
    "gas": 0.183,           # natural gas, gross CV. VERIFY
    "oil": 0.247,           # heating oil. VERIFY
    "lpg": 0.214,           # VERIFY
}
GBP_PER_KWH = {             # VERIFY: tariffs change, used only to turn a £ bill into kWh
    "electricity": 0.25,
    "gas": 0.06,
    "oil": 0.07,
    "lpg": 0.09,
}
M3_GAS_TO_KWH = 11.2        # VERIFY
LITRE_LIQUID_TO_KWH = 10.3  # oil and LPG, rough. VERIFY

PERIOD_DAYS = {"week": 7, "month": 30, "quarter": 91, "year": 365}

# Typical 3-bed semi, per household per year (for the "estimate from the home" method).
TYPICAL_HOME_KWH_PER_YEAR = {"electricity": 2_700, "heating": 11_500}  # VERIFY against Ofgem

# ASSUMPTION placeholders: scale the typical 3-bed home by number of bedrooms.
BEDROOM_SCALE = {1: 0.6, 2: 0.8, 3: 1.0, 4: 1.3, 5: 1.6}
DEFAULT_BEDROOMS = 3

# Words that may appear in the "heating" field, checked in order.
HEATING_KEYWORDS = [
    ("heat pump", "heat_pump"),
    ("oil", "oil"),
    ("lpg", "lpg"),
    ("electric", "electricity"),
    ("gas", "gas"),
]
DEFAULT_HEATING = "gas"
HEAT_PUMP_COP = 3.0         # ASSUMPTION: one kWh of electricity gives about 3 kWh of heat

# --------------------------------------------------------------------------
# Travel
# --------------------------------------------------------------------------
MI_TO_KM = 1.609344

EV_KWH_PER_KM = 0.2         # ASSUMPTION: typical electric car, so the factor follows the grid

CAR_KG_PER_KM = {
    "Petrol": 0.17,         # VERIFY against DESNZ
    "Diesel": 0.17,         # VERIFY
    "Hybrid": 0.12,         # VERIFY
    "Electric": EV_KWH_PER_KM * KG_PER_KWH["electricity"],   # ~0.026
}

TRANSPORT_KG_PER_PASSENGER_KM = {
    "bus": 0.10,            # VERIFY
    "train": 0.035,         # national rail, matches DESNZ ~0.0355
    "flight": 0.15,         # VERIFY: DESNZ economy figures differ by haul and radiative forcing
    "walk": 0.0,
    "bicycle": 0.0,
}

# Used until a distance lookup exists for non-car trips.
DEFAULT_TRIP_KM = {"bus": 8, "train": 40, "flight": 800}

# --------------------------------------------------------------------------
# Food: kg CO2e per normal serving
# Poore & Nemecek (2018) via OWID; portion ~125 g of the main food plus ~0.4 kg
# CO2e of sides. VERIFY. Beef varies a lot by dataset (UK-reared is often 30-40
# kg per kg against a global mean near 99), so say which one you use in the app.
# Note: these include land-use change, which Defra's footprint excludes.
# --------------------------------------------------------------------------
FOOD_KG_PER_SERVING = {
    "beef": 12.8,
    "lamb": 5.4,
    "other_meat": 1.8,
    "fish": 2.1,
    "vegetarian": 1.8,
    "vegan": 0.7,
    "not_sure": 2.5,
}
MEAL_MULTIPLIER = {"Breakfast": 0.7, "Lunch": 1.0, "Dinner": 1.0, "Snack": 0.5}