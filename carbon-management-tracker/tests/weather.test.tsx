import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import WeatherBadge from '../src/components/WeatherBadge'

afterEach(cleanup)

it('shows the live temperature and condition, falling back to Oxford without location', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({
    current: { temperature_2m: 7.6, weather_code: 63, is_day: 1 },
  })))
  vi.stubGlobal('fetch', fetchMock)
  render(<WeatherBadge />)
  const badge = await screen.findByRole('img', { name: '8 degrees, rainy in Oxford' })
  expect(badge.textContent).toBe('8°C')
  expect(document.querySelector('.weather__fall--rain')).not.toBeNull()
  expect(String(fetchMock.mock.calls[0]?.[0 as never])).toContain('latitude=51.752')
})
