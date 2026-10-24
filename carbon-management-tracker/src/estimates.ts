// Rough front-end estimates (kg CO₂e) so logging moves the numbers before the
// backend exists. Factors are approximate UK averages; swap for backend results.

// kg CO₂e per passenger-km
const TRAVEL_KG_PER_KM: Record<string, number> = {
  Petrol: 0.17,
  Diesel: 0.17,
  Hybrid: 0.12,
  Electric: 0.05,
  bus: 0.1,
  train: 0.035,
  flight: 0.15,
  walk: 0,
  bicycle: 0,
}

// Only cars log a distance, so other modes assume a typical trip until the
// backend can work out the distance between the two places
const TYPICAL_TRIP_KM: Record<string, number> = {
  bus: 8,
  train: 40,
  flight: 800,
  walk: 2,
  bicycle: 5,
}

const KM_PER_MILE = 1.609

export function travelKg(entry: {
  mode: string
  fuelType: string | null
  distance: number | null
  unit: 'km' | 'mi' | null
}) {
  if (entry.mode === 'car') {
    const km = (entry.distance ?? 0) * (entry.unit === 'mi' ? KM_PER_MILE : 1)
    return km * TRAVEL_KG_PER_KM[entry.fuelType ?? 'Petrol']
  }
  return TYPICAL_TRIP_KM[entry.mode] * TRAVEL_KG_PER_KM[entry.mode]
}

// kg CO₂e per kWh, and rough unit prices to turn a £ bill into kWh
const ENERGY = {
  electricity: { kgPerKwh: 0.207, poundsPerKwh: 0.25 },
  gas: { kgPerKwh: 0.183, poundsPerKwh: 0.06 },
  oil: { kgPerKwh: 0.247, poundsPerKwh: 0.07 },
  lpg: { kgPerKwh: 0.214, poundsPerKwh: 0.09 },
} as const
type Fuel = keyof typeof ENERGY

const KWH_PER_UNIT: Record<string, number> = {
  kWh: 1,
  'm³': 11.2,
  litres: 10.3,
}

export const PERIOD_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 91,
  year: 365,
}

export function billKg(fuel: Fuel, amount: number, unit: string, occupants: number) {
  const kwh = unit === '£' ? amount / ENERGY[fuel].poundsPerKwh : amount * KWH_PER_UNIT[unit]
  return (kwh * ENERGY[fuel].kgPerKwh) / Math.max(occupants, 1)
}

// A typical UK 3-bed semi uses about 2,700 kWh of electricity and 11,500 kWh
// of heating a year; other homes scale from that
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
        ? (heatKwh / 3) * ENERGY.electricity.kgPerKwh
        : heating === 'Heating oil'
          ? heatKwh * ENERGY.oil.kgPerKwh
          : heating === 'LPG'
            ? heatKwh * ENERGY.lpg.kgPerKwh
            : heatKwh * ENERGY.gas.kgPerKwh
  const yearKg = electricKwh * ENERGY.electricity.kgPerKwh + heatKg
  return yearKg / 12 / Math.max(occupants, 1)
}

// kg CO₂e for one normal serving, including sides
const FOOD_KG_PER_SERVING: Record<string, number> = {
  beef: 12.8,
  lamb: 5.4,
  other_meat: 1.8,
  fish: 2.1,
  vegetarian: 1.8,
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
