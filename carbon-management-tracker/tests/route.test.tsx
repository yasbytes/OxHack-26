import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../src/toast', () => ({ showToast: vi.fn() }))
import { findRoute, straightLineKm } from '../src/route'
import LogPanel from '../src/components/LogPanel'

const PLACES: Record<string, { lat: string; lon: string; name: string }> = {
  'oxford station': { lat: '51.7535', lon: '-1.2700', name: 'Oxford' },
  'london paddington': { lat: '51.5154', lon: '-0.1755', name: 'London Paddington' },
  heathrow: { lat: '51.4680', lon: '-0.4551', name: 'London Heathrow Airport' },
  jfk: { lat: '40.6413', lon: '-73.7781', name: 'John F. Kennedy International Airport' },
}

// Fake OpenStreetMap: place search, and a road router that says 95.1 km
function fakeMaps(routerUp = true) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (url.hostname === 'nominatim.openstreetmap.org') {
      const match = PLACES[url.searchParams.get('q')!.toLowerCase()]
      return new Response(JSON.stringify(match ? [{ ...match, display_name: match.name }] : []))
    }
    if (!routerUp) return new Response('down', { status: 503 })
    return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 95_100 }] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(cleanup)

it('routes car trips by road, searching UK places only', async () => {
  const fetchMock = fakeMaps()
  const route = await findRoute('car', 'Oxford station', 'London Paddington')
  expect(route).toEqual({ km: 95.1, from: 'Oxford', to: 'London Paddington', method: 'road' })
  const search = new URL(String(fetchMock.mock.calls[0][0]))
  expect(search.searchParams.get('countrycodes')).toBe('gb')
  expect(String(fetchMock.mock.calls[2][0])).toContain('/routed-car/route/v1/driving/-1.27,51.7535;-0.1755,51.5154')
})

it('uses the great-circle distance plus 8% for flights, searching worldwide', async () => {
  const fetchMock = fakeMaps()
  const route = await findRoute('flight', 'Heathrow', 'JFK')
  const straight = straightLineKm({ lat: 51.468, lon: -0.4551 }, { lat: 40.6413, lon: -73.7781 })
  expect(straight).toBeGreaterThan(5500)
  expect(straight).toBeLessThan(5600)
  expect(route.km).toBeCloseTo(straight * 1.08)
  expect(route.method).toBe('flight distance')
  // No road router for flights, and no UK-only search
  expect(fetchMock.mock.calls.every(([u]) => !String(u).includes('countrycodes'))).toBe(true)
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes('routing'))).toBe(false)
})

it('falls back to the straight line when the road router is down', async () => {
  fakeMaps(false)
  const route = await findRoute('bus', 'Oxford station', 'London Paddington')
  expect(route.method).toBe('straight line')
  expect(route.km).toBeGreaterThan(80)
})

it('explains when a place can\'t be found', async () => {
  fakeMaps()
  await expect(findRoute('train', 'Nowhere at all', 'London Paddington')).rejects.toThrow(
    'Couldn\'t find "Nowhere at all". Try adding the town.',
  )
})

it('fills in the distance from the form', async () => {
  fakeMaps()
  render(<LogPanel />)
  fireEvent.change(screen.getByLabelText('From (optional)'), { target: { value: 'Oxford station' } })
  fireEvent.change(screen.getByLabelText('To (optional)'), { target: { value: 'London Paddington' } })
  fireEvent.click(screen.getByRole('button', { name: 'Find' }))
  await screen.findByText('Oxford → London Paddington, by road. One way.')
  expect((screen.getByLabelText('Distance') as HTMLInputElement).value).toBe('95.1')
  // Switching to miles converts the found distance
  fireEvent.change(screen.getByLabelText('Distance unit'), { target: { value: 'mi' } })
  expect((screen.getByLabelText('Distance') as HTMLInputElement).value).toBe('59.1')
}, 10_000)
