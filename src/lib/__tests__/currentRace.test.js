import { describe, it, expect } from 'vitest'
import { findCurrentRaceNumber } from '../currentRace'

function race(raceNumber, hasResults) {
  return { type: 'race', raceNumber, hasResults, hasDraw: true, lanes: [] }
}

describe('findCurrentRaceNumber', () => {
  it('returns null when there are no races', () => {
    expect(findCurrentRaceNumber([])).toBeNull()
    expect(findCurrentRaceNumber([{ type: 'break', label: 'Lunch' }])).toBeNull()
  })

  it('falls back to the first race when nothing has results yet', () => {
    const entries = [race(1, false), race(2, false), race(3, false)]
    expect(findCurrentRaceNumber(entries)).toBe(1)
  })

  it('picks the race right after the most recent one with results', () => {
    const entries = [race(1, true), race(2, true), race(3, false), race(4, false)]
    expect(findCurrentRaceNumber(entries)).toBe(3)
  })

  it('ignores breaks when finding the next race', () => {
    const entries = [race(1, true), { type: 'break', label: 'Lunch' }, race(2, false)]
    expect(findCurrentRaceNumber(entries)).toBe(2)
  })

  it('returns the last race itself once the regatta is finished', () => {
    const entries = [race(1, true), race(2, true), race(3, true)]
    expect(findCurrentRaceNumber(entries)).toBe(3)
  })

  it('uses the most recent result, not the first, when results are out of order', () => {
    const entries = [race(1, true), race(2, false), race(3, true), race(4, false)]
    expect(findCurrentRaceNumber(entries)).toBe(4)
  })
})
