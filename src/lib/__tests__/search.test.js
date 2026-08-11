import { describe, it, expect } from 'vitest'
import { parseRegattaData } from '../csvParser'
import {
  buildSearchIndex,
  getMatchedNameSet,
  findDisambiguationCandidates,
  laneMatchesQuery,
  laneMatchesClubs,
  laneMatchesIdentity,
  annotateEntries,
} from '../search'
import { SCHEDULE_ONLY, RESULTS_ONLY } from './fixtures'

function setup() {
  const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
  const index = buildSearchIndex(entries)
  return { entries, index }
}

describe('fuzzy name search', () => {
  it('finds "Zach Miller" when a parent types the common misspelling "Zack"', () => {
    const { index } = setup()
    const matched = getMatchedNameSet(index, 'Zack')
    expect(matched.has('zach miller')).toBe(true)
  })

  it('does not match an unrelated athlete who only shares a surname', () => {
    // Regression test: the live sheet has both a "Ben Cooper" and a "Kenzie
    // Cooper" — searching the full name "Ben Cooper" must not also surface
    // Kenzie Cooper just because the last word matches.
    const { index } = setup()
    const matched = getMatchedNameSet(index, 'Ben Cooper')
    expect(matched.has('ben cooper')).toBe(true)
    expect(matched.has('kenzie cooper')).toBe(false)
  })

  it('still tolerates a typo within a full name', () => {
    const { index } = setup()
    const matched = getMatchedNameSet(index, 'Ben Coper')
    expect(matched.has('ben cooper')).toBe(true)
  })
})

describe('athlete disambiguation', () => {
  it('flags two distinct athletes with the same name at different clubs', () => {
    const { index } = setup()
    const candidates = findDisambiguationCandidates(index, 'John Smith')
    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.club).sort()).toEqual(['Carleton Place Canoe Club', 'Ottawa River Canoe Club'])
  })

  it('does not prompt disambiguation for the same athlete racing solo and in a mixed crew', () => {
    const { index } = setup()
    // Ben Cooper races solo for ORCC (race 2) and in an ORCC/CPCC mixed boat (race 3) —
    // these share the ORCC club, so they should be recognized as the same person.
    const candidates = findDisambiguationCandidates(index, 'Ben Cooper')
    expect(candidates).toHaveLength(1)
  })
})

describe('interclub / mixed-crew matching', () => {
  it('matches a mixed boat by any one crew member name', () => {
    const { entries, index } = setup()
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    const lane = race3.lanes[0]
    expect(laneMatchesQuery(lane, 'Maverick', getMatchedNameSet(index, 'Maverick'))).toBe(true)
  })

  it('text search never matches by club code — club codes are filtered separately', () => {
    const { entries, index } = setup()
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    const lane = race3.lanes[0] // ORCC/CPCC mixed boat
    expect(laneMatchesQuery(lane, 'CPCC', getMatchedNameSet(index, 'CPCC'))).toBe(false)
    expect(laneMatchesQuery(lane, 'ORCC', getMatchedNameSet(index, 'ORCC'))).toBe(false)
  })
})

describe('laneMatchesClubs — exact club-chip filtering (fixes ORCC/RCC substring bug)', () => {
  it('does not match "RCC" against a boat whose club is "ORCC"', () => {
    const lane = { clubs: ['ORCC'] }
    expect(laneMatchesClubs(lane, new Set(['RCC']))).toBe(false)
  })

  it('matches an exact club code', () => {
    const lane = { clubs: ['ORCC'] }
    expect(laneMatchesClubs(lane, new Set(['ORCC']))).toBe(true)
  })

  it('matches an interclub boat against either of its component clubs, but not an absent one', () => {
    const lane = { clubs: ['ORCC', 'CPCC'] }
    expect(laneMatchesClubs(lane, new Set(['ORCC']))).toBe(true)
    expect(laneMatchesClubs(lane, new Set(['CPCC']))).toBe(true)
    expect(laneMatchesClubs(lane, new Set(['NBCC']))).toBe(false)
  })

  it('returns false when no club is selected', () => {
    const lane = { clubs: ['ORCC'] }
    expect(laneMatchesClubs(lane, new Set())).toBe(false)
  })
})

describe('disambiguated identity filtering', () => {
  it('narrows to exactly the selected athlete once disambiguated', () => {
    const { entries } = setup()
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const orccJohn = race1.lanes.find((l) => l.clubs.includes('Ottawa River Canoe Club') && l.names.includes('John Smith'))
    const cpccJohn = race1.lanes.find((l) => l.clubs.includes('Carleton Place Canoe Club') && l.names.includes('John Smith'))

    const identity = { name: 'John Smith', club: 'Ottawa River Canoe Club' }
    expect(laneMatchesIdentity(orccJohn, identity)).toBe(true)
    expect(laneMatchesIdentity(cpccJohn, identity)).toBe(false)
  })
})

describe('crew details attached to disambiguation candidates', () => {
  it('records a crew for a name that appears in one multi-athlete boat', () => {
    const { index } = setup()
    const [emery] = findDisambiguationCandidates(index, 'Emery Gautihier')
    expect(emery.crews).toHaveLength(1)
    expect(emery.crews[0]).toMatchObject({ raceNumber: 2, boatType: 'K2' })
    expect(emery.crews[0].athletes).toEqual([
      { name: 'Emery Gautihier', club: 'Ottawa River Canoe Club' },
      { name: 'Henry Trussler', club: 'Ottawa River Canoe Club' },
    ])
  })

  it('merges crews from both a solo-adjacent and a mixed-crew appearance of the same athlete', () => {
    const { index } = setup()
    // Ben Cooper races a same-club 2-person boat (race 2, K2) and a mixed
    // 4-person boat (race 3, C4) — both are genuine crews and both must show.
    const [ben] = findDisambiguationCandidates(index, 'Ben Cooper')
    expect(ben.crews.map((c) => c.boatType).sort()).toEqual(['C4', 'K2'])

    const mixedCrew = ben.crews.find((c) => c.boatType === 'C4')
    const fullMixedClub = 'Ottawa River Canoe Club/Carleton Place Canoe Club'
    expect(mixedCrew.athletes).toEqual([
      { name: 'Ben Cooper', club: fullMixedClub },
      { name: 'Maverick Lacelle', club: fullMixedClub },
      { name: 'Alex Chan', club: fullMixedClub },
      { name: 'Sam Lee', club: fullMixedClub },
    ])
  })

  it('returns an empty crew list for an athlete who only ever raced solo', () => {
    const { index } = setup()
    const candidates = findDisambiguationCandidates(index, 'John Smith')
    expect(candidates.every((c) => c.crews.length === 0)).toBe(true)
  })
})

describe('annotateEntries', () => {
  it('marks races and lanes as matched based on the active query', () => {
    const { entries, index } = setup()
    const matchedNameSet = getMatchedNameSet(index, 'Ben Cooper')
    const annotated = annotateEntries(entries, { query: 'Ben Cooper', selectedIdentity: null, matchedNameSet })

    const race2 = annotated.find((e) => e.type === 'race' && e.raceNumber === 2)
    const race3 = annotated.find((e) => e.type === 'race' && e.raceNumber === 3)
    const race1 = annotated.find((e) => e.type === 'race' && e.raceNumber === 1)

    expect(race2.matched).toBe(true)
    expect(race3.matched).toBe(true)
    expect(race1.matched).toBe(false)
  })

  it('a club filter alone (no text query) filters races without needing a name match', () => {
    const { entries } = setup()
    const annotated = annotateEntries(entries, {
      query: '',
      selectedIdentity: null,
      matchedNameSet: new Set(),
      selectedClubs: new Set(['North Bay Canoe Club']),
    })

    const race4 = annotated.find((e) => e.type === 'race' && e.raceNumber === 4) // Kenzie Cooper, NBCC
    const race1 = annotated.find((e) => e.type === 'race' && e.raceNumber === 1) // ORCC/CPCC only

    expect(race4.matched).toBe(true)
    expect(race1.matched).toBe(false)
  })

  it('intersects an active name query with an active club filter', () => {
    const { entries, index } = setup()
    const matchedNameSet = getMatchedNameSet(index, 'Ben Cooper')
    // Ben Cooper's boats (races 2 and 3) are all ORCC or ORCC/CPCC — never NBCC.
    const annotated = annotateEntries(entries, {
      query: 'Ben Cooper',
      selectedIdentity: null,
      matchedNameSet,
      selectedClubs: new Set(['North Bay Canoe Club']),
    })

    const race2 = annotated.find((e) => e.type === 'race' && e.raceNumber === 2)
    const race3 = annotated.find((e) => e.type === 'race' && e.raceNumber === 3)

    expect(race2.matched).toBe(false)
    expect(race3.matched).toBe(false)
  })

  it('a name query for "Zach" combined with the Ottawa River Canoe Club chip only matches Zachs from that club', () => {
    const { entries, index } = setup()
    const matchedNameSet = getMatchedNameSet(index, 'Zach')
    const annotated = annotateEntries(entries, {
      query: 'Zach',
      selectedIdentity: null,
      matchedNameSet,
      selectedClubs: new Set(['Ottawa River Canoe Club']),
    })

    const race1 = annotated.find((e) => e.type === 'race' && e.raceNumber === 1)
    const zachLane = race1.lanes.find((l) => l.names.includes('Zach Miller'))
    expect(zachLane.matched).toBe(true)
    expect(race1.matched).toBe(true)
  })
})
