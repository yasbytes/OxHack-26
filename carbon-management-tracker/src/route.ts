// Distance between two places from OpenStreetMap, free and with no key:
// Nominatim finds the places, and the FOSSGIS OSRM servers route along real
// roads, footpaths and cycle paths. Neither has rail or air routes, so trains
// and flights use the straight-line distance with an allowance for detours.

export type RouteMode = 'car' | 'bus' | 'train' | 'flight' | 'walk' | 'bicycle'

export type RouteResult = {
  km: number
  from: string
  to: string
  // How the distance was found, to show next to it
  method: 'road' | 'path' | 'cycle route' | 'rail estimate' | 'flight distance' | 'straight line'
}

type Place = { lat: number; lon: number; name: string }

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const ROUTER = 'https://routing.openstreetmap.de'
const PROFILES: Partial<Record<RouteMode, { path: string; method: RouteResult['method'] }>> = {
  car: { path: 'routed-car', method: 'road' },
  bus: { path: 'routed-car', method: 'road' },
  walk: { path: 'routed-foot', method: 'path' },
  bicycle: { path: 'routed-bike', method: 'cycle route' },
}
// Rail lines wind more than a straight line (ASSUMPTION). Flights follow
// DESNZ guidance: add 8% to the great-circle distance for indirect routes.
const RAIL_DETOUR = 1.2
const FLIGHT_UPLIFT = 1.08
// Used when the road router is down, so the trip can still be logged
const ROAD_DETOUR = 1.3

export class RouteError extends Error {}

// Nominatim asks for at most one request a second
let lastSearch = 0
async function throttle() {
  const wait = lastSearch + 1100 - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastSearch = Date.now()
}

const places = new Map<string, Place>()

async function findPlace(query: string, worldwide: boolean): Promise<Place> {
  const key = `${worldwide ? 'world' : 'gb'}:${query.trim().toLowerCase()}`
  const cached = places.get(key)
  if (cached) return cached

  await throttle()
  const params = new URLSearchParams({ q: query.trim(), format: 'jsonv2', limit: '1' })
  // Everyday trips are in the UK; without this "Oxford station" finds a hamlet in Canada
  if (!worldwide) params.set('countrycodes', 'gb')
  const response = await fetch(`${NOMINATIM}?${params}`)
  if (!response.ok) throw new RouteError('The map search is busy. Try again in a moment.')
  const [match] = (await response.json()) as { lat: string; lon: string; name: string; display_name: string }[]
  if (!match) throw new RouteError(`Couldn't find "${query.trim()}". Try adding the town.`)

  const place = { lat: Number(match.lat), lon: Number(match.lon), name: match.name || match.display_name.split(',')[0] }
  places.set(key, place)
  return place
}

// Great-circle distance in km
export function straightLineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

async function routedKm(path: string, a: Place, b: Place) {
  const url = `${ROUTER}/${path}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Routing failed (${response.status})`)
  const data = (await response.json()) as { code: string; routes?: { distance: number }[] }
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(data.code)
  return data.routes[0].distance / 1000
}

export async function findRoute(mode: RouteMode, from: string, to: string): Promise<RouteResult> {
  const worldwide = mode === 'flight'
  const a = await findPlace(from, worldwide)
  const b = await findPlace(to, worldwide)
  const names = { from: a.name, to: b.name }
  const straight = straightLineKm(a, b)

  if (mode === 'flight') return { ...names, km: straight * FLIGHT_UPLIFT, method: 'flight distance' }
  if (mode === 'train') return { ...names, km: straight * RAIL_DETOUR, method: 'rail estimate' }

  const profile = PROFILES[mode]!
  try {
    return { ...names, km: await routedKm(profile.path, a, b), method: profile.method }
  } catch {
    return { ...names, km: straight * ROAD_DETOUR, method: 'straight line' }
  }
}
