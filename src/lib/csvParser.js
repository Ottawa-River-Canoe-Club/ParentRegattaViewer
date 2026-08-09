import Papa from 'papaparse'

const SCHEDULE_ALIASES = {
  time: ['TIME'],
  race: ['RACE', 'RACENO'],
  event: ['EVENT'],
  heat: ['HEAT', 'HEATNO'],
  distance: ['DISTANCE'],
}

const LANE_ALIASES = {
  lane: ['LANE'],
  names: ['NAMES', 'NAME'],
  club: ['CLUB', 'CLUBS'],
  time: ['TIME'],
  finish: ['FINISH', 'PLACE'],
  points: ['POINTS', 'PTS'],
}

// Rideau's schedule tab has no single "Event" column — the event name is
// assembled from Age + Gender + Boat instead, and the race number has no
// header text of its own (it's always column 0).
const RIDEAU_SCHEDULE_ALIASES = {
  age: ['AGE'],
  gender: ['GENDER'],
  boat: ['BOAT'],
  distance: ['DISTANCE'],
  final: ['FINAL'],
  time: ['TIME'],
}

function normalize(cell) {
  return (cell ?? '').toString().trim()
}

function normalizeKey(cell) {
  return normalize(cell).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeHeat(value) {
  const v = normalize(value)
  if (!v) return ''
  if (/^final$/i.test(v)) return 'Final'
  const m = v.match(/^heat\s*(\d+)$/i)
  if (m) return `Heat ${m[1]}`
  return v
}

// The results sheet sometimes shortens club codes to fit an interclub crew's
// CLUB cell within its character limit (e.g. "PCKC/OR/CP" rather than
// "PCKC/ORCC/CPCC"). Map each shortened alias to its canonical code so those
// crews are recognized as the same club as everyone else's, both in the
// unique-club list and in each lane's own club data.
const CLUB_ALIASES = {
  OR: 'ORCC',
  CP: 'CPCC',
  SL: 'SLCC',
}

function normalizeClub(club) {
  const trimmed = normalize(club)
  return CLUB_ALIASES[trimmed] ?? trimmed
}

/** Maps field names to column indexes by matching header text, so leading blank
 * columns or reordered columns don't break parsing (only positional offsets would). */
function findColumnMap(headerRow, aliasesByField) {
  const map = {}
  headerRow.forEach((cell, idx) => {
    const key = normalizeKey(cell)
    if (!key) return
    for (const [field, aliases] of Object.entries(aliasesByField)) {
      if (map[field] !== undefined) continue
      if (aliases.includes(key)) map[field] = idx
    }
  })
  return map
}

function extractTitle(rows, headerRowIdx) {
  let title = null
  for (let i = 0; i < headerRowIdx; i++) {
    const nonEmpty = rows[i].map(normalize).filter(Boolean)
    if (nonEmpty.length === 1 && nonEmpty[0].length > 3) {
      title = nonEmpty[0]
    }
  }
  return title
}

/** True (with the day number) for a text-only "Day 1 Schedule" / "Day 2"
 * divider row inserted between a multi-day regatta's daily blocks of races.
 * Checked before any other row-type test in every section parser, so a
 * divider can never be mistaken for a race, a break, a block header, or —
 * worst case — a stray lane row with the divider text as its "name". */
function matchDayDivider(cells) {
  for (const cell of cells) {
    const match = cell.match(/^day\s*(\d+)\b/i)
    if (match) return Number(match[1])
  }
  return null
}

function parseScheduleSection(rows) {
  const headerRowIdx = rows.findIndex((row) => {
    const map = findColumnMap(row, SCHEDULE_ALIASES)
    return map.time !== undefined && map.race !== undefined
  })

  if (headerRowIdx === -1) {
    return { scheduleMap: new Map(), scheduleOrder: [], title: null }
  }

  const colMap = findColumnMap(rows[headerRowIdx], SCHEDULE_ALIASES)
  const title = extractTitle(rows, headerRowIdx)
  const scheduleMap = new Map()
  const scheduleOrder = []
  let currentDay

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cells = rows[i].map(normalize)
    if (cells.every((c) => c === '')) continue

    const dayMatch = matchDayDivider(cells)
    if (dayMatch !== null) {
      currentDay = dayMatch
      continue
    }

    // Re-matching the header itself (e.g. a repeated header further down) — skip, not a data row.
    if (findColumnMap(rows[i], SCHEDULE_ALIASES).time === colMap.time && normalizeKey(cells[colMap.time]) === 'TIME') {
      continue
    }

    const raceCell = cells[colMap.race]
    const raceNumber = parseInt(raceCell, 10)

    if (Number.isInteger(raceNumber) && String(raceNumber) === raceCell) {
      scheduleMap.set(raceNumber, {
        time: cells[colMap.time] || '',
        event: cells[colMap.event] || '',
        heat: normalizeHeat(cells[colMap.heat]),
        distance: cells[colMap.distance] || '',
        day: currentDay,
      })
      scheduleOrder.push({ type: 'race', raceNumber })
    } else {
      const label = [cells[colMap.time], cells[colMap.event], cells[colMap.heat], cells[colMap.distance]].find(
        (c) => c && c.length > 0,
      )
      if (label) scheduleOrder.push({ type: 'break', label, day: currentDay })
    }
  }

  return { scheduleMap, scheduleOrder, title }
}

function parseRideauScheduleSection(rows) {
  const headerRowIdx = rows.findIndex((row) => {
    const map = findColumnMap(row, RIDEAU_SCHEDULE_ALIASES)
    return map.age !== undefined && map.gender !== undefined && map.boat !== undefined
  })

  if (headerRowIdx === -1) {
    return { scheduleMap: new Map(), scheduleOrder: [], title: null }
  }

  const colMap = findColumnMap(rows[headerRowIdx], RIDEAU_SCHEDULE_ALIASES)
  const title = extractTitle(rows, headerRowIdx)
  const scheduleMap = new Map()
  const scheduleOrder = []
  let currentDay

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cells = rows[i].map(normalize)
    if (cells.every((c) => c === '')) continue

    const dayMatch = matchDayDivider(cells)
    if (dayMatch !== null) {
      currentDay = dayMatch
      continue
    }

    const raceCell = cells[0]
    const raceNumber = parseInt(raceCell, 10)

    if (Number.isInteger(raceNumber) && String(raceNumber) === raceCell) {
      const event = [cells[colMap.age], cells[colMap.gender], cells[colMap.boat]].filter(Boolean).join(' ')
      scheduleMap.set(raceNumber, {
        time: cells[colMap.time] || '',
        event,
        heat: normalizeHeat(cells[colMap.final]),
        distance: cells[colMap.distance] || '',
        day: currentDay,
      })
      scheduleOrder.push({ type: 'race', raceNumber })
    } else {
      // No fixed column holds a break label here (unlike EOD, which reuses
      // its own TIME/EVENT/HEAT/DISTANCE columns) — take whatever text
      // shows up after the race-number column.
      const label = cells.slice(1).find((c) => c && c.length > 0)
      if (label) scheduleOrder.push({ type: 'break', label, day: currentDay })
    }
  }

  return { scheduleMap, scheduleOrder, title }
}

function parseResultsSection(rows) {
  const blocks = []
  let current = null
  let colMap = null
  let currentDay

  for (const row of rows) {
    const cells = row.map(normalize)
    if (cells.every((c) => c === '')) continue

    const dayMatch = matchDayDivider(cells)
    if (dayMatch !== null) {
      currentDay = dayMatch
      continue
    }

    const eventIdx = cells.findIndex((c) => c.toUpperCase() === 'EVENT')
    if (eventIdx !== -1) {
      const raceNumber = parseInt(cells[eventIdx + 1], 10)
      current = {
        raceNumber: Number.isInteger(raceNumber) ? raceNumber : null,
        eventName: cells[eventIdx + 2] || '',
        heat: normalizeHeat(cells[eventIdx + 3] || ''),
        distance: cells[eventIdx + 4] || '',
        day: currentDay,
        lanes: [],
      }
      blocks.push(current)
      colMap = null
      continue
    }

    const laneHeaderMap = findColumnMap(row, LANE_ALIASES)
    if (laneHeaderMap.lane !== undefined && laneHeaderMap.names !== undefined) {
      colMap = laneHeaderMap
      continue
    }

    if (current && colMap) {
      const laneNumber = cells[colMap.lane] || ''
      const namesCell = colMap.names !== undefined ? cells[colMap.names] || '' : ''
      const clubCell = colMap.club !== undefined ? cells[colMap.club] || '' : ''
      const timeCell = colMap.time !== undefined ? cells[colMap.time] || '' : ''
      const finishCell = colMap.finish !== undefined ? cells[colMap.finish] || '' : ''
      const pointsCell = colMap.points !== undefined ? cells[colMap.points] || '' : ''

      if (!laneNumber && !namesCell) continue

      const names = namesCell
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const clubs = clubCell
        .split('/')
        .map((s) => normalizeClub(s))
        .filter(Boolean)

      current.lanes.push({ laneNumber, names, clubs, time: timeCell, finish: finishCell, points: pointsCell })
    }
  }

  const map = new Map()
  for (const block of blocks) {
    if (block.raceNumber !== null) map.set(block.raceNumber, block)
  }
  return map
}

/** Rideau's draw tab folds the distance into the event name itself
 * ("U16 Men C4 1000m") rather than giving it its own column — split it back
 * out so `event` matches the schedule tab's shape and boatTypeFromEvent
 * (which just reads the event's last word) still lands on the boat class
 * instead of the distance. */
function splitTrailingDistance(rawEvent) {
  const match = rawEvent.match(/^(.*)\s+(\d+m)$/i)
  if (!match) return { event: rawEvent, distance: '' }
  return { event: match[1].trim(), distance: match[2] }
}

/** Rideau crews are usually "/"-separated ("A / B / C"), but at least one
 * real sheet quoted a crew as a plain comma list instead — only fall back to
 * comma-splitting when no "/" is present, so that fallback never fires on
 * the normal case. */
function splitRideauNames(namesCell) {
  const delimiter = namesCell.includes('/') ? '/' : ','
  return namesCell
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** True for a row that starts a Rideau race block: race number in column 0,
 * literal "Lane" in column 1. EOD's results tab also has a "LANE" header,
 * but on its own row with an empty column 0 — requiring both columns avoids
 * confusing the two formats. */
function isRideauEventRow(cells) {
  const raceCell = cells[0]
  const raceNumber = parseInt(raceCell, 10)
  return Number.isInteger(raceNumber) && String(raceNumber) === raceCell && cells[1].toUpperCase() === 'LANE'
}

/** Unlike EOD, Rideau's draw tab has no separate lane-header row — the block
 * header row above fixes every data row's column layout. The finish time
 * itself is read from column 5 first, not column 4 as the header row's own
 * "Time:" label (column 5) implies at a glance: column 4 turns out to hold a
 * DNS/SCR status instead whenever a crew didn't finish, so it's only used as
 * a fallback. */
function parseRideauResultsSection(rows) {
  const blocks = []
  let current = null
  let currentDay

  for (const row of rows) {
    const cells = row.map(normalize)
    if (cells.every((c) => c === '')) continue

    const dayMatch = matchDayDivider(cells)
    if (dayMatch !== null) {
      currentDay = dayMatch
      continue
    }

    if (isRideauEventRow(cells)) {
      const { event: eventName, distance } = splitTrailingDistance(cells[2])
      current = {
        raceNumber: parseInt(cells[0], 10),
        eventName,
        heat: normalizeHeat(cells[3]),
        distance,
        day: currentDay,
        lanes: [],
      }
      blocks.push(current)
      continue
    }

    if (!current) continue

    const laneNumber = cells[1] || ''
    if (!laneNumber) continue // stray annotation rows ("Move Starter to 200m") have no lane number

    current.lanes.push({
      laneNumber,
      names: splitRideauNames(cells[2] || ''),
      clubs: (cells[3] || '').split('/').map(normalizeClub).filter(Boolean),
      time: cells[5] || cells[4] || '',
      finish: cells[0] || '',
      points: '',
    })
  }

  const map = new Map()
  for (const block of blocks) map.set(block.raceNumber, block)
  return map
}

/** Scans the draw/results tab's first ~10 rows for a Rideau race block
 * header (see isRideauEventRow). Defaults to EOD when nothing matches. */
function sniffResultsFormat(rows) {
  const limit = Math.min(10, rows.length)
  for (let i = 0; i < limit; i++) {
    if (isRideauEventRow(rows[i].map(normalize))) return 'rideau'
  }
  return 'eod'
}

/** Sniffs from whichever tab actually has content — a Rideau regatta with no
 * results posted yet would otherwise default to EOD (since sniffResultsFormat
 * finds nothing to match) and fail to parse its own schedule on race morning. */
function detectFormat(scheduleRows, resultsRows) {
  if (sniffResultsFormat(resultsRows) === 'rideau') return 'rideau'

  const scheduleLooksRideau = scheduleRows.some((row) => {
    const map = findColumnMap(row, RIDEAU_SCHEDULE_ALIASES)
    return map.age !== undefined && map.gender !== undefined && map.boat !== undefined
  })
  return scheduleLooksRideau ? 'rideau' : 'eod'
}

function mergeSections(scheduleOrder, scheduleMap, resultsMap) {
  const entries = []
  const consumed = new Set()

  for (const item of scheduleOrder) {
    if (item.type === 'break') {
      entries.push({ type: 'break', label: item.label, day: item.day })
      continue
    }

    const sched = scheduleMap.get(item.raceNumber)
    const result = resultsMap.get(item.raceNumber)
    if (result) consumed.add(item.raceNumber)

    const lanes = result?.lanes ?? []
    entries.push({
      type: 'race',
      raceNumber: item.raceNumber,
      time: sched?.time || '',
      event: sched?.event || result?.eventName || '',
      heat: sched?.heat || result?.heat || '',
      distance: sched?.distance || result?.distance || '',
      day: sched?.day ?? result?.day,
      lanes,
      hasDraw: lanes.length > 0,
      hasResults: lanes.some((l) => l.time || l.finish || l.points),
    })
  }

  const extras = [...resultsMap.entries()]
    .filter(([raceNumber]) => !consumed.has(raceNumber))
    .sort((a, b) => a[0] - b[0])

  for (const [raceNumber, result] of extras) {
    entries.push({
      type: 'race',
      raceNumber,
      time: '',
      event: result.eventName || '',
      heat: result.heat || '',
      distance: result.distance || '',
      day: result.day,
      lanes: result.lanes,
      hasDraw: result.lanes.length > 0,
      hasResults: result.lanes.some((l) => l.time || l.finish || l.points),
    })
  }

  return entries
}

/** Collects every individual club code referenced across all lanes, sorted
 * alphabetically, for the dedicated club-filter UI. Interclub crews (CLUB =
 * "ORCC/CPCC") are split on "/" so each component club becomes its own entry
 * rather than one compound one — otherwise the filter chips couldn't
 * distinguish a boat's clubs from each other, and a chip for "ORCC" wouldn't
 * find boats where ORCC is only part of a mixed crew. Each piece also passes
 * through normalizeClub so a shortened alias (e.g. "OR") collapses into the
 * same chip as its canonical code ("ORCC") rather than getting its own. */
function extractUniqueClubs(entries) {
  const clubSet = new Set()
  for (const entry of entries) {
    if (entry.type !== 'race') continue
    for (const lane of entry.lanes) {
      for (const rawClub of lane.clubs) {
        rawClub
          .split('/')
          .map((c) => normalizeClub(c))
          .filter(Boolean)
          .forEach((c) => clubSet.add(c))
      }
    }
  }
  return [...clubSet].sort((a, b) => a.localeCompare(b))
}

/**
 * Parses the regatta's two source tabs into a single ordered list of
 * race/break entries. The two tabs are fetched as separate CSV exports (see
 * useRegattaData), so each is parsed on its own rather than split out of one
 * combined document. Column positions are detected from header text rather
 * than assumed — including which *format* a given regatta's sheet uses in
 * the first place (see detectFormat), since different organizing clubs lay
 * their schedule/draw sheets out with entirely different columns, not just
 * different header spelling.
 */
export function parseRegattaData(scheduleCsvText, resultsCsvText) {
  const { data: scheduleRows } = Papa.parse(scheduleCsvText ?? '', { skipEmptyLines: false })
  const { data: resultsRows } = Papa.parse(resultsCsvText ?? '', { skipEmptyLines: false })

  const format = detectFormat(scheduleRows, resultsRows)
  const { scheduleMap, scheduleOrder, title } =
    format === 'rideau' ? parseRideauScheduleSection(scheduleRows) : parseScheduleSection(scheduleRows)
  const resultsMap = format === 'rideau' ? parseRideauResultsSection(resultsRows) : parseResultsSection(resultsRows)

  const entries = mergeSections(scheduleOrder, scheduleMap, resultsMap)
  const clubs = extractUniqueClubs(entries)

  return { title, entries, parsedAt: Date.now(), clubs }
}
