// Front-end estimates (kg CO₂e) so logging moves the numbers before the
// backend calculates them. Every factor mirrors backend/app/factors.py, which
// cites its sources: change a number there and here together.

// kg CO₂e per kWh of UK grid electricity (DESNZ 2026)
const GRID_KG_PER_KWH = 0.131
// A typical electric car uses about 0.2 kWh per km, so it follows the grid
const EV_KWH_PER_KM = 0.2

// Per vehicle-km for cars, so a full car isn't split between passengers
const CAR_KG_PER_KM: Record<string, number> = {
  Petrol: 0.17,
  Diesel: 0.17,
  Hybrid: 0.12,
  Electric: EV_KWH_PER_KM * GRID_KG_PER_KWH,
}

// Per passenger-km for everything else
const TRANSPORT_KG_PER_KM: Record<string, number> = {
  bus: 0.1,
  train: 0.035,
  flight: 0.15,
  walk: 0,
  bicycle: 0,
}

const KM_PER_MILE = 1.609344

export function travelKg(entry: {
  mode: string
  fuelType: string | null
  distance: number
  unit: 'km' | 'mi'
}) {
  const km = entry.distance * (entry.unit === 'mi' ? KM_PER_MILE : 1)
  const perKm =
    entry.mode === 'car'
      ? CAR_KG_PER_KM[entry.fuelType ?? 'Petrol']
      : TRANSPORT_KG_PER_KM[entry.mode]
  return km * (perKm ?? 0)
}

// kg CO₂e per kWh, and rough unit prices to turn a £ bill into kWh
const ENERGY = {
  electricity: { kgPerKwh: GRID_KG_PER_KWH, poundsPerKwh: 0.25 },
  gas: { kgPerKwh: 0.183, poundsPerKwh: 0.06 },
  oil: { kgPerKwh: 0.247, poundsPerKwh: 0.07 },
  lpg: { kgPerKwh: 0.214, poundsPerKwh: 0.09 },
} as const
type Fuel = keyof typeof ENERGY

// A £ bill includes a daily standing charge that isn't energy used (Ofgem cap,
// roughly). Oil and LPG are bought by the delivery, so they have none.
const STANDING_POUNDS_PER_DAY: Record<Fuel, number> = {
  electricity: 0.53,
  gas: 0.32,
  oil: 0,
  lpg: 0,
}

// kWh in one unit of each fuel. LPG holds much less energy per litre than oil.
const KWH_PER_UNIT: Record<Fuel, Record<string, number>> = {
  electricity: { kWh: 1 },
  gas: { kWh: 1, 'm³': 11.2 },
  oil: { litres: 10.3 },
  lpg: { litres: 7.1 },
}

export const PERIOD_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 91,
  year: 365,
}

export function billKg(
  fuel: Fuel,
  amount: number,
  unit: string,
  occupants: number,
  periodDays: number,
) {
  const kwh =
    unit === '£'
      ? Math.max(0, amount - STANDING_POUNDS_PER_DAY[fuel] * periodDays) / ENERGY[fuel].poundsPerKwh
      : amount * (KWH_PER_UNIT[fuel][unit] ?? 1)
  return (kwh * ENERGY[fuel].kgPerKwh) / Math.max(occupants, 1)
}

// A typical UK 3-bed semi uses about 2,700 kWh of electricity and 11,500 kWh
// of heating a year (Ofgem); other homes scale from that
const HOME_SCALE: Record<string, number> = {
  Flat: 0.8,
  'Terraced house': 0.95,
  'Semi-detached house': 1,
  'Detached house': 1.25,
}
const BEDROOM_SCALE: Record<string, number> = {
  Studio: 0.5,
  '1': 0.6,
  '2': 0.8,
  '3': 1,
  '4': 1.3,
  '5+': 1.6,
}
// One kWh of electricity gives about 3 kWh of heat from a heat pump
const HEAT_PUMP_COP = 3

// One month of home energy for the "Estimate it" option
export function homeEstimateKg(
  homeType: string,
  bedrooms: string,
  heating: string,
  occupants: number,
) {
  const scale = (HOME_SCALE[homeType] ?? 1) * (BEDROOM_SCALE[bedrooms] ?? 1)
  const electricKwh = 2700 * scale
  const heatKwh = 11500 * scale
  const heatKg =
    heating === 'Electric heaters'
      ? heatKwh * ENERGY.electricity.kgPerKwh
      : heating === 'Heat pump'
        ? (heatKwh / HEAT_PUMP_COP) * ENERGY.electricity.kgPerKwh
        : heating === 'Heating oil'
          ? heatKwh * ENERGY.oil.kgPerKwh
          : heating === 'LPG'
            ? heatKwh * ENERGY.lpg.kgPerKwh
            : heatKwh * ENERGY.gas.kgPerKwh
  const yearKg = electricKwh * ENERGY.electricity.kgPerKwh + heatKg
  return yearKg / 12 / Math.max(occupants, 1)
}

// kg CO₂e for one normal serving, including sides (Poore & Nemecek 2018).
// Vegetarian sits between vegan and meat because of the dairy and eggs.
const FOOD_KG_PER_SERVING: Record<string, number> = {
  beef: 12.8,
  lamb: 5.4,
  other_meat: 1.8,
  fish: 2.1,
  vegetarian: 1.2,
  vegan: 0.7,
  not_sure: 2.5,
}

// Breakfasts and snacks are smaller than main meals
const MEAL_SCALE: Record<string, number> = {
  Breakfast: 0.7,
  Lunch: 1,
  Dinner: 1,
  Snack: 0.5,
}

export function foodKg(category: string, mealType: string, servings: number) {
  return FOOD_KG_PER_SERVING[category] * (MEAL_SCALE[mealType] ?? 1) * servings
}
