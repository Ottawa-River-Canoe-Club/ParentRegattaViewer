import { describe, it, expect } from 'vitest'
import { findLastCompletedRaceNumber } from '../lastCompletedRace'

function race(raceNumber, hasResults) {
  return { type: 'race', raceNumber, hasResults, hasDraw: true, lanes: [] }
}

describe('findLastCompletedRaceNumber', () => {
  it('returns null when there are no races', () => {
    expect(findLastCompletedRaceNumber([])).toBeNull()
    expect(findLastCompletedRaceNumber([{ type: 'break', label: 'Lunch' }])).toBeNull()
  })

  it('returns null when nothing has results yet (start of the day)', () => {
    const entries = [race(1, false), race(2, false), race(3, false)]
    expect(findLastCompletedRaceNumber(entries)).toBeNull()
  })

  it('picks the highest race number with results, not the next upcoming one', () => {
    const entries = [race(1, true), race(2, true), race(3, false), race(4, false)]
    expect(findLastCompletedRaceNumber(entries)).toBe(2)
  })

  it('ignores breaks', () => {
    const entries = [race(1, true), { type: 'break', label: 'Lunch' }, race(2, false)]
    expect(findLastCompletedRaceNumber(entries)).toBe(1)
  })

  it('returns the last race once the whole regatta is finished', () => {
    const entries = [race(1, true), race(2, true), race(3, true)]
    expect(findLastCompletedRaceNumber(entries)).toBe(3)
  })

  it('uses the maximum completed race number, ignoring a later race that lacks results', () => {
    const entries = [race(1, true), race(2, false), race(3, true), race(4, false)]
    expect(findLastCompletedRaceNumber(entries)).toBe(3)
  })

  it('is robust to entries not being in race-number order', () => {
    // Real sheets aren't always in strict order (ghost rows, manual re-entry) —
    // the max must come from raceNumber itself, not array position.
    const entries = [race(3, true), race(1, true), race(2, false)]
    expect(findLastCompletedRaceNumber(entries)).toBe(3)
  })
})
