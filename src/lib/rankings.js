import { toDisplayCase } from './format'

/** Parses a lane's raw finish-time string into total seconds for sorting.
 * Handles both time formats this app ingests: EOD's "M:SS.ss" and Rideau's
 * "H:MM'SS.ss" (Rideau's leading hours is always "00" in practice, but
 * parsed anyway rather than assumed). Returns null for anything that isn't
 * a real time — a blank cell, or a status like DNF/DNS/SCR — so callers can
 * drop those with a single null check instead of matching status strings. */
export function parseFinishTimeSeconds(raw) {
  const value = (raw ?? '').toString().trim()
  if (!value) return null

  const rideauMatch = value.match(/^(\d+):(\d+)'(\d+(?:\.\d+)?)$/)
  if (rideauMatch) {
    const [, hours, minutes, seconds] = rideauMatch
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  }

  const eodMatch = value.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (eodMatch) {
    const [, minutes, seconds] = eodMatch
    return Number(minutes) * 60 + Number(seconds)
  }

  return null
}

/** Groups races into "the same event" for overall-standings purposes: same
 * event name and same distance, regardless of which heat/final produced the
 * time — that's what lets Heat 1/2/3 (or Rideau's Final 1/2/3) combine into
 * one list. Distance is part of the key, not just the event name, because at
 * least one real sheet reuses an event name across different distances later
 * in the day (e.g. "Open Women K1" at both 1000m and 200m); without it,
 * unrelated sprint and distance times would rank against each other. */
function eventGroupKey(race) {
  const event = (race.event ?? '')
    .trim()
    .replace(/\s+(heat\s*\d+|final\s*\d*)$/i, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
  const distance = (race.distance ?? '').trim().toLowerCase()
  return `${event}|${distance}`
}

function eventGroupLabel(race) {
  const event = toDisplayCase(race.event) || 'Untitled event'
  return race.distance ? `${event} · ${race.distance}` : event
}

/**
 * Aggregates every finished lane across all heats/finals of the same event
 * and distance into one time-ranked list per event, for a qualification-style
 * overall-standings view. Lanes without a parseable finish time (DNS, DNF,
 * SCR, or an unfilled slot) are left out entirely rather than ranked at the
 * bottom, since there's no time to rank them by. Groups are returned in the
 * order their first heat appears in the schedule.
 */
export function buildOverallRankings(entries) {
  const groups = new Map()

  for (const race of entries) {
    if (race.type !== 'race') continue
    const key = eventGroupKey(race)

    if (!groups.has(key)) {
      groups.set(key, { key, label: eventGroupLabel(race), rankings: [] })
    }
    const group = groups.get(key)

    for (const lane of race.lanes) {
      if (!lane.names || lane.names.length === 0) continue
      const seconds = parseFinishTimeSeconds(lane.time)
      if (seconds === null) continue

      group.rankings.push({
        raceNumber: race.raceNumber,
        laneNumber: lane.laneNumber,
        names: lane.names,
        clubs: lane.clubs,
        time: lane.time,
        seconds,
      })
    }
  }

  const result = []
  for (const group of groups.values()) {
    if (group.rankings.length === 0) continue
    group.rankings.sort((a, b) => a.seconds - b.seconds)
    group.rankings.forEach((entry, idx) => {
      entry.rank = idx + 1
    })
    result.push(group)
  }
  return result
}
