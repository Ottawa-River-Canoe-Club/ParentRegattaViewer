import { describe, it, expect } from 'vitest'
import { parseRegattaData } from '../csvParser'
import { laneMatchesClubs } from '../search'
import { SCHEDULE_ONLY, RESULTS_ONLY } from './fixtures'

describe('parseRegattaData — schedule tab (matches the real live sheet today)', () => {
  it('parses races in order and captures the title', () => {
    const { title, entries } = parseRegattaData(SCHEDULE_ONLY, '')
    expect(title).toBe('EOD U12 & U14 Championships 2026')
    expect(entries.map((e) => (e.type === 'race' ? e.raceNumber : `break:${e.label}`))).toEqual([
      1,
      2,
      3,
      'break:LUNCH BREAK',
      4,
    ])
  })

  it('does not crash when the results tab is empty (e.g. still loading, or unreachable)', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, '')
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.lanes).toEqual([])
    expect(race1.hasDraw).toBe(false)
    expect(race1.hasResults).toBe(false)
    expect(race1.time).toBe('8:00:00')
    expect(race1.distance).toBe('500m')
  })

  it('normalizes FINAL heat casing', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, '')
    const race4 = entries.find((e) => e.type === 'race' && e.raceNumber === 4)
    expect(race4.heat).toBe('Final')
  })
})

describe('parseRegattaData — draw/results tab (separate CSV export, own gid)', () => {
  it('merges schedule time with draw/results lanes by race number', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.time).toBe('8:00:00') // from the schedule tab
    expect(race1.hasDraw).toBe(true)
    expect(race1.hasResults).toBe(true)
    expect(race1.lanes).toHaveLength(3)
  })

  it('handles the results tab\'s own leading-blank-column inconsistency (Event rows have none, LANE rows do)', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.event).toBe('U14 Boys K1') // schedule tab's title-cased name wins when both tabs have one
    expect(race1.lanes[0].laneNumber).toBe('1')
  })

  it('splits quoted multi-athlete names correctly', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race2.lanes[0].names).toEqual(['Emery Gautihier', 'Henry Trussler'])
    expect(race2.hasResults).toBe(false) // blank time/finish/points
  })

  it('splits mixed-club boats into individual club codes', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    expect(race3.lanes[0].clubs).toEqual(['ORCC', 'CPCC'])
    expect(race3.lanes[0].names).toEqual(['Ben Cooper', 'Maverick Lacelle', 'Alex Chan', 'Sam Lee'])
  })

  it('reads lane finish/time/points', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const lane1 = race1.lanes.find((l) => l.laneNumber === '1')
    expect(lane1.finish).toBe('1')
    expect(lane1.points).toBe('10')
    expect(lane1.time).toBe('2:15.3')
  })
})

describe('parseRegattaData — unique club extraction', () => {
  it('collects every distinct club, alphabetically, splitting interclub crews into their component clubs', () => {
    const { clubs } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    // Race 3's lane is the compound "ORCC/CPCC" — it must contribute ORCC and
    // CPCC individually, not a single "ORCC/CPCC" entry.
    expect(clubs).toEqual(['CPCC', 'NBCC', 'ORCC'])
  })

  it('returns an empty list when there are no results yet', () => {
    const { clubs } = parseRegattaData(SCHEDULE_ONLY, '')
    expect(clubs).toEqual([])
  })
})

describe('parseRegattaData — club alias normalization', () => {
  // The results sheet shortens club codes to squeeze an interclub crew's CLUB
  // cell under a character limit, e.g. "PCKC/OR/CP" instead of the full
  // "PCKC/ORCC/CPCC".
  const ALIASED_RESULTS = `Event,1,U12 MIXED C-15,FINAL,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,"Dale Reader, Amara Nanduri, Quinn McIntyre",PCKC/OR/CP,,,
,2,Zach Miller,OR,,,
`

  it('expands shortened aliases to their canonical club code on each lane', () => {
    const { entries } = parseRegattaData('', ALIASED_RESULTS)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.lanes[0].clubs).toEqual(['PCKC', 'ORCC', 'CPCC'])
    expect(race1.lanes[1].clubs).toEqual(['ORCC'])
  })

  it('collapses aliased and canonical spellings into one entry in the unique-club list', () => {
    const { clubs } = parseRegattaData('', ALIASED_RESULTS)
    expect(clubs).toEqual(['CPCC', 'ORCC', 'PCKC'])
  })

  it('lets the ORCC chip match a boat that was only ever written as "OR" in the sheet', () => {
    const { entries } = parseRegattaData('', ALIASED_RESULTS)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(laneMatchesClubs(race1.lanes[0], new Set(['ORCC']))).toBe(true)
    expect(laneMatchesClubs(race1.lanes[1], new Set(['ORCC']))).toBe(true)
  })
})
