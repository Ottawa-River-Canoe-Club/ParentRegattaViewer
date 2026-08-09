import { describe, it, expect } from 'vitest'
import { parseFinishTimeSeconds, buildOverallRankings } from '../rankings'

describe('parseFinishTimeSeconds', () => {
  it('parses EOD-style M:SS.ss times into total seconds', () => {
    expect(parseFinishTimeSeconds('01:48.16')).toBeCloseTo(108.16)
    expect(parseFinishTimeSeconds('02:10.79')).toBeCloseTo(130.79)
  })

  it('ranks a faster EOD time below a slower one', () => {
    expect(parseFinishTimeSeconds('01:48.16')).toBeLessThan(parseFinishTimeSeconds('02:10.79'))
  })

  it("parses Rideau-style H:MM'SS.ss times into total seconds", () => {
    expect(parseFinishTimeSeconds("00:05'10.29")).toBeCloseTo(310.29)
    expect(parseFinishTimeSeconds("00:01'22.65")).toBeCloseTo(82.65)
  })

  it('returns null for a DNS/DNF/SCR status or a blank cell', () => {
    expect(parseFinishTimeSeconds('DNS')).toBeNull()
    expect(parseFinishTimeSeconds('DNF')).toBeNull()
    expect(parseFinishTimeSeconds('SCR')).toBeNull()
    expect(parseFinishTimeSeconds('')).toBeNull()
    expect(parseFinishTimeSeconds(null)).toBeNull()
  })
})

function race({ raceNumber, event, heat, distance = '500m', lanes }) {
  return { type: 'race', raceNumber, event, heat, distance, lanes, hasDraw: true, hasResults: true }
}

function lane(laneNumber, names, clubs, time) {
  return { laneNumber, names, clubs, time, finish: '', points: '' }
}

describe('buildOverallRankings', () => {
  it('combines two heats of the same event into one time-ranked list', () => {
    const entries = [
      race({
        raceNumber: 1,
        event: 'U12 Boys K1',
        heat: 'Heat 1',
        lanes: [lane('1', ['Alex Chan'], ['ORCC'], '01:50.00'), lane('2', ['Sam Lee'], ['CPCC'], '01:55.00')],
      }),
      race({
        raceNumber: 2,
        event: 'U12 Boys K1',
        heat: 'Heat 2',
        lanes: [lane('1', ['Ben Cooper'], ['ORCC'], '01:48.16'), lane('2', ['Zach Miller'], ['ORCC'], '02:10.79')],
      }),
    ]

    const groups = buildOverallRankings(entries)
    expect(groups).toHaveLength(1)
    const [group] = groups
    expect(group.label).toBe('U12 Boys K1 · 500m')
    expect(group.rankings.map((r) => r.names[0])).toEqual(['Ben Cooper', 'Alex Chan', 'Sam Lee', 'Zach Miller'])
    expect(group.rankings.map((r) => r.rank)).toEqual([1, 2, 3, 4])
  })

  it('filters out DNS/DNF/SCR and unfilled lanes before ranking', () => {
    const entries = [
      race({
        raceNumber: 1,
        event: 'U14 Girls C1',
        heat: 'Heat 1',
        lanes: [
          lane('1', ['Finished Racer'], ['RCC'], '02:00.00'),
          lane('2', ['Scratched Racer'], ['RCC'], 'SCR'),
          lane('3', [], [], ''), // unfilled/TBD lane
        ],
      }),
    ]

    const [group] = buildOverallRankings(entries)
    expect(group.rankings).toHaveLength(1)
    expect(group.rankings[0].names).toEqual(['Finished Racer'])
  })

  it('keeps different distances of the same event name as separate groups', () => {
    const entries = [
      race({
        raceNumber: 1,
        event: 'Open Women K1',
        heat: 'Final 1',
        distance: '1000m',
        lanes: [lane('1', ['Distance Racer'], ['RCC'], "00:05'10.29")],
      }),
      race({
        raceNumber: 2,
        event: 'Open Women K1',
        heat: 'Final 1',
        distance: '200m',
        lanes: [lane('1', ['Sprint Racer'], ['RCC'], "00:00'48.32")],
      }),
    ]

    const groups = buildOverallRankings(entries)
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.label).sort()).toEqual(['Open Women K1 · 1000m', 'Open Women K1 · 200m'])
  })

  it('excludes events with no finished results yet', () => {
    const entries = [
      race({
        raceNumber: 1,
        event: 'U16 Men C4',
        heat: 'Heat 1',
        lanes: [lane('1', ['Not Yet Home'], ['ORCC'], '')],
      }),
    ]
    expect(buildOverallRankings(entries)).toEqual([])
  })

  it('ignores break entries mixed in with races', () => {
    const entries = [
      { type: 'break', label: 'Lunch' },
      race({
        raceNumber: 1,
        event: 'U16 Men C4',
        heat: 'Heat 1',
        lanes: [lane('1', ['Racer'], ['ORCC'], '02:00.00')],
      }),
    ]
    expect(buildOverallRankings(entries)).toHaveLength(1)
  })

  it('lists event groups in the order their first heat appears', () => {
    const entries = [
      race({ raceNumber: 1, event: 'B Event', heat: 'Heat 1', lanes: [lane('1', ['X'], ['RCC'], '01:00.00')] }),
      race({ raceNumber: 2, event: 'A Event', heat: 'Heat 1', lanes: [lane('1', ['Y'], ['RCC'], '01:00.00')] }),
    ]
    const groups = buildOverallRankings(entries)
    expect(groups.map((g) => g.label)).toEqual(['B Event · 500m', 'A Event · 500m'])
  })
})
