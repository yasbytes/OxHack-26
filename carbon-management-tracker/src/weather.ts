import { useEffect, useState } from 'react'

// Live weather from Open-Meteo 

const FALLBACK = { latitude: 51.752, longitude: -1.2577, place: 'Oxford' }
// Weather barely changes within a few minutes, so reuse a recent reading
const MAX_AGE_MS = 15 * 60_000

export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

export type Weather = {
  temperature: number
  condition: Condition
  isDay: boolean
  // Only set when we fell back to a default place
  place: string | null
  fetchedAt: number
}

// WMO weather codes, as Open-Meteo reports them
function conditionFor(code: number): Condition {
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'rain'
}

export const CONDITION_LABELS: Record<Condition, string> = {
  clear: 'clear',
  partly: 'partly cloudy',
  cloudy: 'cloudy',
  fog: 'foggy',
  rain: 'rainy',
  snow: 'snowy',
  storm: 'stormy',
}

function locate(): Promise<{ latitude: number; longitude: number; place: string | null }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(FALLBACK)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, place: null }),
      () => resolve(FALLBACK),
      { timeout: 8000, maximumAge: 30 * 60_000 },
    )
  })
}

async function fetchWeather(): Promise<Weather> {
  const { latitude, longitude, place } = await locate()
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}` +
    '&current=temperature_2m,weather_code,is_day&timezone=auto'
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`)
  const { current } = (await response.json()) as {
    current: { temperature_2m: number; weather_code: number; is_day: number }
  }
  return {
    temperature: Math.round(current.temperature_2m),
    condition: conditionFor(current.weather_code),
    isDay: current.is_day === 1,
    place,
    fetchedAt: Date.now(),
  }
}

// Shared between Home visits so switching tabs doesn't refetch
let cached: Weather | null = null
let pending: Promise<Weather> | null = null

function loadWeather() {
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return Promise.resolve(cached)
  pending ??= fetchWeather()
    .then((weather) => (cached = weather))
    .finally(() => (pending = null))
  return pending
}

// null while loading or if the weather can't be reached
export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(cached)

  useEffect(() => {
    let active = true
    function refresh() {
      loadWeather()
        .then((next) => active && setWeather(next))
        .catch(() => {
          // Offline or blocked: keep whatever we last showed
        })
    }
    refresh()
    const timer = setInterval(refresh, MAX_AGE_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return weather
}
