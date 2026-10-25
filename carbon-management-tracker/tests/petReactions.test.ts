import { expect, it } from 'vitest'
import { reactionFor } from '../src/petReactions'
import type { LogItem } from '../src/logStore'

const entry = (kind: LogItem['kind'], title: string, detail = ''): LogItem => ({
  id: 'new', kind, title, detail, date: '2026-10-25', loggedAt: 1, kg: 1,
})

it.each([
  ['food', 'Dinner: Beef', 'meaty meal'],
  ['food', 'Lunch: Lamb', 'meaty meal'],
  ['food', 'Dinner: Chicken / pork', 'Meat on the menu'],
  ['food', 'Lunch: Fish / seafood', 'Fish on the menu'],
  ['food', 'Dinner: Vegetarian', 'meat-free meal'],
  ['travel', 'Bicycle', 'zoomies'],
  ['travel', 'Walk', 'two feet'],
  ['travel', 'Train', 'public transport'],
  ['travel', 'Bus / Coach', 'public transport'],
  ['travel', 'Car / Motorbike (Electric)', 'car trip'],
  ['travel', 'Flight', 'flight on the log'],
  ['energy', 'Electricity bill', 'Energy logged'],
] as const)('reacts specifically to %s / %s', (kind, title, phrase) => {
  expect(reactionFor(entry(kind, title)).says).toContain(phrase)
  expect(reactionFor(entry(kind, title)).voice).toMatch(/reaction-.*\.mp3/)
})

it('uses the selected food category rather than ingredient words in descriptions', () => {
  const reaction = reactionFor(entry('food', 'Dinner: Vegan', 'Vegan beef burger'))
  expect(reaction.says).toContain('meat-free meal')
})

it('does not invent the footprint of an unknown free-text entry', () => {
  expect(reactionFor({ ...entry('quick', 'Maybe a flight next year'), kg: null }).says).toMatch(/^Logged!/)
  expect(reactionFor(entry('food', 'Lunch: Not sure')).says).toMatch(/^Meal logged!/)
})
