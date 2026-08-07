import { describe, it, expect } from 'vitest'
import { parseRegattaCsv } from '../csvParser'
import {
  buildSearchIndex,
  getMatchedNameSet,
  findDisambiguationCandidates,
  laneMatchesQuery,
  laneMatchesIdentity,
  annotateEntries,
} from '../search'
import { WITH_RESULTS } from './fixtures'

function setup() {
  const { entries } = parseRegattaCsv(WITH_RESULTS)
  const index = buildSearchIndex(entries)
  return { entries, index }
}

describe('fuzzy name search', () => {
  it('finds "Zach Miller" when a parent types the common misspelling "Zack"', () => {
    const { index } = setup()
    const matched = getMatchedNameSet(index, 'Zack')
    expect(matched.has('zach miller')).toBe(true)
  })
})

describe('athlete disambiguation', () => {
  it('flags two distinct athletes with the same name at different clubs', () => {
    const { index } = setup()
    const candidates = findDisambiguationCandidates(index, 'John Smith')
    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.club).sort()).toEqual(['CPCC', 'ORCC'])
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
  it('matches a mixed ORCC/CPCC boat when searching for either club code', () => {
    const { entries } = setup()
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    const lane = race3.lanes[0]
    const { index } = setup()

    expect(laneMatchesQuery(lane, 'CPCC', getMatchedNameSet(index, 'CPCC'))).toBe(true)
    expect(laneMatchesQuery(lane, 'ORCC', getMatchedNameSet(index, 'ORCC'))).toBe(true)
  })

  it('matches a mixed boat by any one crew member name', () => {
    const { entries, index } = setup()
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    const lane = race3.lanes[0]
    expect(laneMatchesQuery(lane, 'Maverick', getMatchedNameSet(index, 'Maverick'))).toBe(true)
  })

  it('does not cross-contaminate: searching CPCC only matches boats that actually include CPCC', () => {
    const { entries, index } = setup()
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const orccOnlyLane = race1.lanes.find((l) => l.clubs.includes('ORCC') && !l.clubs.includes('CPCC'))
    expect(laneMatchesQuery(orccOnlyLane, 'CPCC', getMatchedNameSet(index, 'CPCC'))).toBe(false)
  })
})

describe('disambiguated identity filtering', () => {
  it('narrows to exactly the selected athlete once disambiguated', () => {
    const { entries } = setup()
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const orccJohn = race1.lanes.find((l) => l.clubs.includes('ORCC') && l.names.includes('John Smith'))
    const cpccJohn = race1.lanes.find((l) => l.clubs.includes('CPCC') && l.names.includes('John Smith'))

    const identity = { name: 'John Smith', club: 'ORCC' }
    expect(laneMatchesIdentity(orccJohn, identity)).toBe(true)
    expect(laneMatchesIdentity(cpccJohn, identity)).toBe(false)
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
})
