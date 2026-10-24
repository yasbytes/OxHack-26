import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../src/toast', () => ({ showToast: vi.fn() }))
import { addLogItem, setLogUser, useLog } from '../src/logStore'

afterEach(() => { cleanup(); setLogUser(null); localStorage.clear() })

it('keeps account histories separate and preserves anonymous demo data', () => {
  localStorage.setItem('carbon-log', '[{"id":"legacy-demo"}]')
  const { result } = renderHook(useLog)
  act(() => {
    setLogUser('alice')
    addLogItem({ kind: 'travel', date: '2026-10-24', title: 'Train to work', detail: '10 km', kg: 0.4 })
  })
  expect(result.current).toHaveLength(1)
  act(() => setLogUser(null))
  expect(result.current).toEqual([])
  act(() => setLogUser('bob'))
  expect(result.current).toEqual([])
  act(() => setLogUser('alice'))
  expect(result.current[0].title).toBe('Train to work')
  expect(localStorage.getItem('carbon-log')).toBe('[{"id":"legacy-demo"}]')
})
