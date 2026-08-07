import { describe, it, expect } from 'vitest'
import { parseRegattaCsv } from '../csvParser'
import { SCHEDULE_ONLY, WITH_RESULTS } from './fixtures'

describe('parseRegattaCsv — schedule section (matches the real live sheet today)', () => {
  it('parses races in order and captures the title', () => {
    const { title, entries } = parseRegattaCsv(SCHEDULE_ONLY)
    expect(title).toBe('EOD U12 & U14 Championships 2026')
    expect(entries.map((e) => (e.type === 'race' ? e.raceNumber : `break:${e.label}`))).toEqual([
      1,
      2,
      3,
      'break:LUNCH BREAK',
      4,
    ])
  })

  it('does not crash when there is no DRAWRESULTS section yet', () => {
    const { entries } = parseRegattaCsv(SCHEDULE_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.lanes).toEqual([])
    expect(race1.hasDraw).toBe(false)
    expect(race1.hasResults).toBe(false)
    expect(race1.time).toBe('8:00:00')
    expect(race1.distance).toBe('500m')
  })

  it('normalizes FINAL heat casing', () => {
    const { entries } = parseRegattaCsv(SCHEDULE_ONLY)
    const race4 = entries.find((e) => e.type === 'race' && e.raceNumber === 4)
    expect(race4.heat).toBe('Final')
  })
})

describe('parseRegattaCsv — DRAWRESULTS section', () => {
  it('merges schedule time with draw/results lanes by race number', () => {
    const { entries } = parseRegattaCsv(WITH_RESULTS)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.time).toBe('8:00:00') // from schedule section
    expect(race1.hasDraw).toBe(true)
    expect(race1.hasResults).toBe(true)
    expect(race1.lanes).toHaveLength(3)
  })

  it('splits quoted multi-athlete names correctly', () => {
    const { entries } = parseRegattaCsv(WITH_RESULTS)
    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race2.lanes[0].names).toEqual(['Emery Gautihier', 'Henry Trussler'])
    expect(race2.hasResults).toBe(false) // blank time/finish/points
  })

  it('splits mixed-club boats into individual club codes', () => {
    const { entries } = parseRegattaCsv(WITH_RESULTS)
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    expect(race3.lanes[0].clubs).toEqual(['ORCC', 'CPCC'])
    expect(race3.lanes[0].names).toEqual(['Ben Cooper', 'Maverick Lacelle', 'Alex Chan', 'Sam Lee'])
  })

  it('reads lane finish/time/points', () => {
    const { entries } = parseRegattaCsv(WITH_RESULTS)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const lane1 = race1.lanes.find((l) => l.laneNumber === '1')
    expect(lane1.finish).toBe('1')
    expect(lane1.points).toBe('10')
    expect(lane1.time).toBe('2:15.3')
  })
})
