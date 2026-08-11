import { describe, it, expect } from 'vitest'
import { parseRegattaData } from '../csvParser'
import { laneMatchesClubs, buildSearchIndex } from '../search'
import {
  SCHEDULE_ONLY,
  RESULTS_ONLY,
  RIDEAU_SCHEDULE_ONLY,
  RIDEAU_RESULTS_ONLY,
  MULTI_DAY_SCHEDULE,
  MULTI_DAY_RESULTS,
  CKO_SCHEDULE_ONLY,
  CKO_RESULTS_ONLY,
} from './fixtures'

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

  // The CKO draw tab alone had 35 distinct strings for what turned out to be
  // a much smaller set of real clubs — a typo ("Buroak"), bare city names,
  // full names (some of them club-specific, not a generic "<City> Canoe
  // Club" — e.g. "Gananoque Canoe & Motorboat Club"), and acronyms, all for
  // the same handful of real clubs. Every variant collapses to one short
  // acronym: a lane block has room for one club per boat, not a full name,
  // especially for an interclub crew showing two at once.
  const MESSY_CLUB_RESULTS = `Event,1,U16 MIXED C4,FINAL,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,Skater One,Buroak,,,
,2,Skater Two,Burloak,,,
,3,Skater Three,Burloak Canoe Club,,,
,4,Skater Four,Balmy Beach,,,
,5,Skater Five,Richmond Hill,,,
,6,Skater Six,Cobourg District Boat and Canoe Club,,,
,7,Skater Seven,Gananoque Canoe & Motorboat Club,,,
,8,Skater Eight,Sudbury Canoe Club,,,
,9,Skater Nine,CPC,,,
,10,Skater Ten,South Niagara Canoe Club,,,
`

  it('normalizes a typo and every short-form/full-name variant found in the real sheet to its acronym', () => {
    const { entries } = parseRegattaData('', MESSY_CLUB_RESULTS)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const clubFor = (laneNumber) => race1.lanes.find((l) => l.laneNumber === laneNumber).clubs[0]

    expect(clubFor('1')).toBe('BCC') // typo
    expect(clubFor('2')).toBe('BCC') // bare city name
    expect(clubFor('3')).toBe('BCC') // full name
    expect(clubFor('4')).toBe('BBCC')
    expect(clubFor('5')).toBe('RHCC')
    expect(clubFor('6')).toBe('CDBCC')
    expect(clubFor('7')).toBe('GCC')
    expect(clubFor('8')).toBe('SCC')
    expect(clubFor('9')).toBe('CPCC') // "CPC", missing the second "C" for "Club"
    expect(clubFor('10')).toBe('SNCC') // never seen abbreviated in the real sheet — see CLUB_CODES
  })

  it('already-canonical acronyms pass through unchanged', () => {
    const { clubs } = parseRegattaData('', RESULTS_ONLY)
    expect(clubs).toEqual(expect.arrayContaining(['ORCC', 'NBCC']))
  })
})

describe('parseRegattaData — Rideau format (age/gender/boat schedule, Lane-marked draw tab)', () => {
  it('sniffs the Rideau format from the draw tab and parses races in schedule order', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    expect(entries.map((e) => (e.type === 'race' ? e.raceNumber : `break:${e.label}`))).toEqual([
      1,
      2,
      3,
      "break:20' Course Break",
      4,
    ])
  })

  it('assembles the event name from Age + Gender + Boat and keeps distance separate', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.event).toBe('U16 Men C4')
    expect(race1.distance).toBe('1000m')
    expect(race1.heat).toBe('Final 1')
    expect(race1.time).toBe('8:00 AM') // from the schedule tab, not the draw tab
  })

  it('still lets boatTypeFromEvent (in search.js) read the boat class off the assembled event name', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const index = buildSearchIndex(entries)
    const identity = index.identities.find((i) => i.name === 'Will Bertazzo')
    expect(identity.crews[0].boatType).toBe('C4')
  })

  it('splits "/"-separated crew names', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const winner = race1.lanes.find((l) => l.laneNumber === '6')
    expect(winner.names).toEqual(['Will Bertazzo', 'Weylan Stewart', 'Kiernan McCulloch', 'Devlin Payne'])
  })

  it('falls back to comma-splitting a crew that was quoted with commas instead of slashes', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    const quotedLane = race3.lanes.find((l) => l.laneNumber === '3')
    expect(quotedLane.names).toEqual(['Paul Mullen', 'Vasyl Zelnichenko', 'Sarah Kennedy', 'Amelia Gauthier'])
  })

  it('resolves finish time from column 5, falling back to column 4 for a DNF/SCR status', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)

    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const finisher = race1.lanes.find((l) => l.laneNumber === '6')
    expect(finisher.time).toBe("00:05'10.29")
    expect(finisher.finish).toBe('1')
    const dnf = race1.lanes.find((l) => l.laneNumber === '4')
    expect(dnf.time).toBe('DNF')

    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    const scratched = race2.lanes.find((l) => l.laneNumber === '7')
    expect(scratched.time).toBe('SCR')
  })

  it('treats an unfilled lane slot as TBD rather than dropping it', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const empty = race1.lanes.find((l) => l.laneNumber === '9')
    expect(empty.names).toEqual([])
  })

  it('ignores a course-break annotation row sitting inside a race block instead of treating it as a lane', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race2.lanes.some((l) => l.names.includes("20' Course Break"))).toBe(false)
  })

  it('handles a blank club cell without crashing', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    const race3 = entries.find((e) => e.type === 'race' && e.raceNumber === 3)
    const blankClub = race3.lanes.find((l) => l.laneNumber === '4')
    expect(blankClub.clubs).toEqual([])
  })

  it('still detects the format from the schedule tab alone when no results are posted yet', () => {
    const { entries } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, '')
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.event).toBe('U16 Men C4')
    expect(race1.hasDraw).toBe(false)
  })

  it('collects unique clubs the same way as the EOD format', () => {
    const { clubs } = parseRegattaData(RIDEAU_SCHEDULE_ONLY, RIDEAU_RESULTS_ONLY)
    expect(clubs).toEqual(expect.arrayContaining(['CPCC', 'RCC', 'PICC']))
  })
})

describe('parseRegattaData — multi-day regattas (Day 1 / Day 2 dividers)', () => {
  it('assigns day 1 to races before the divider and day 2 to races after it', () => {
    const { entries } = parseRegattaData(MULTI_DAY_SCHEDULE, MULTI_DAY_RESULTS)
    const byRace = (n) => entries.find((e) => e.type === 'race' && e.raceNumber === n)
    expect(byRace(1).day).toBe(1)
    expect(byRace(2).day).toBe(1)
    expect(byRace(3).day).toBe(2)
    expect(byRace(4).day).toBe(2)
  })

  it('does not create a race or break entry for the day-divider row itself', () => {
    const { entries } = parseRegattaData(MULTI_DAY_SCHEDULE, MULTI_DAY_RESULTS)
    expect(entries.filter((e) => e.type === 'break')).toHaveLength(0)
    expect(entries.filter((e) => e.type === 'race').map((e) => e.raceNumber)).toEqual([1, 2, 3, 4])
  })

  it("tracks day independently in the draw/results tab, for a race that's only found there", () => {
    const { entries } = parseRegattaData('', MULTI_DAY_RESULTS)
    const byRace = (n) => entries.find((e) => e.type === 'race' && e.raceNumber === n)
    expect(byRace(1).day).toBe(1)
    expect(byRace(2).day).toBe(1)
    expect(byRace(3).day).toBe(2)
    expect(byRace(4).day).toBe(2)
  })

  it('tags a break between two days with whichever day precedes it', () => {
    const scheduleWithBreak = MULTI_DAY_SCHEDULE.replace(
      ',Day 2,,,,',
      ',LUNCH BREAK,,,,\n,Day 2,,,,',
    )
    const { entries } = parseRegattaData(scheduleWithBreak, MULTI_DAY_RESULTS)
    const lunch = entries.find((e) => e.type === 'break')
    expect(lunch.label).toBe('LUNCH BREAK')
    expect(lunch.day).toBe(1)
  })

  it('has no day at all on a single-day regatta (no divider ever seen)', () => {
    const { entries } = parseRegattaData(SCHEDULE_ONLY, RESULTS_ONLY)
    expect(entries.every((e) => e.day === undefined)).toBe(true)
  })
})

describe('parseRegattaData — CKO format (Ontario Championships draw)', () => {
  it('splits distance and heat back out of the event string on both tabs', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.event).toBe("U16 Women's C2")
    expect(race1.distance).toBe('500m')
    expect(race1.heat).toBe('Final A')
  })

  it('reads the race number from its own row below the block header, not the header row itself', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race2).toBeDefined()
    expect(race2.event).toBe("U16 Men's IC4")
    expect(race2.lanes.map((l) => l.laneNumber)).toEqual(['0', '1'])
  })

  it('splits crew names on comma, "and", and "/" — including a single crew that mixes "/" and ","', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.lanes.find((l) => l.laneNumber === '0').names).toEqual(['Greta Dybinski', 'Eleanor Blake'])
    expect(race1.lanes.find((l) => l.laneNumber === '1').names).toEqual(['Jordan Mavraganis', 'Kennedy Mavraganis'])

    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race2.lanes.find((l) => l.laneNumber === '1').names).toEqual([
      'Anna Andrus',
      'Chloe Andrus',
      'Zara Dew',
      'Aurora McWilliam',
    ])
  })

  it('skips an unfilled lane slot instead of creating an empty crew', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    expect(race1.lanes).toHaveLength(2) // lane 2 is blank in the fixture and must not appear
  })

  it('produces no race at all for a trailing ghost block with no event name', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const raceNumbers = entries.filter((e) => e.type === 'race').map((e) => e.raceNumber)
    expect(raceNumbers).toEqual([1, 2, 3, 4])
  })

  it('still recognizes a break row on the schedule tab the same way EOD does', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const breakEntry = entries.find((e) => e.type === 'break')
    expect(breakEntry.label).toBe('Break')
  })

  it("never reads the per-club standings side table as lane data", () => {
    const { entries, clubs } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    expect(clubs).not.toContain('OVERALL RESULTS')
    expect(clubs).not.toContain('Balmy Beach')
    const allNames = entries.filter((e) => e.type === 'race').flatMap((e) => e.lanes.flatMap((l) => l.names))
    expect(allNames).not.toContain('DAY 1 - SATURDAY AUGUST 15')
  })

  it('normalizes club names read straight off the draw tab, including an acronym unique to this sheet', () => {
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, CKO_RESULTS_ONLY)
    const race1 = entries.find((e) => e.type === 'race' && e.raceNumber === 1)
    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race1.lanes.find((l) => l.laneNumber === '0').clubs).toEqual(['RCC'])
    expect(race1.lanes.find((l) => l.laneNumber === '1').clubs).toEqual(['ORCC'])
    expect(race2.lanes.find((l) => l.laneNumber === '0').clubs).toEqual(['MCC'])
    expect(race2.lanes.find((l) => l.laneNumber === '1').clubs).toEqual(['CDBCC'])
  })

  it('splits an interclub crew\'s club cell on "," as well as "/" — the real sheet used both', () => {
    // A real cell must quote the club field to keep its embedded comma from
    // being read as a new column — replacing just the "MCC" token (not the
    // whole row) keeps every other column's position exactly as it was.
    const commaInterclub = CKO_RESULTS_ONLY.replace('M. Kravchuk,MCC,', 'M. Kravchuk,"NBCC, PCKC",')
    const { entries } = parseRegattaData(CKO_SCHEDULE_ONLY, commaInterclub)
    const race2 = entries.find((e) => e.type === 'race' && e.raceNumber === 2)
    expect(race2.lanes.find((l) => l.laneNumber === '0').clubs).toEqual(['NBCC', 'PCKC'])
  })
})
