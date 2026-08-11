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

// The same real club shows up under its acronym, a bare city/area name, a
// full name, or (once) a straight-up typo, depending on which cell of which
// sheet you're reading — the CKO draw tab alone had 35 distinct strings for
// what turned out to be a much smaller set of actual clubs. Standardized on
// each club's short acronym rather than its full name: a lane block has
// room for one, not the other, especially for an interclub crew showing two
// clubs at once ("Ottawa River Canoe Club / Rideau Canoe Club" doesn't fit;
// "ORCC / RCC" does). The full names this collapses away are never lost —
// see CLUB_LEGEND below, which is what ClubLegend renders. Keys are matched
// case-insensitively (see normalizeClub).
const CLUB_CODES = {
  // 2-letter shorthand the results sheet sometimes uses to fit an interclub
  // crew's CLUB cell under a character limit (e.g. "PCKC/OR/CP" instead of
  // "PCKC/ORCC/CPCC").
  OR: 'ORCC',
  CP: 'CPCC',
  SL: 'SLCC',

  BURLOAK: 'BCC',
  BUROAK: 'BCC', // typo seen in the real sheet
  'BURLOAK CANOE CLUB': 'BCC',
  'BALMY BEACH': 'BBCC',
  'BALMY BEACH CANOE CLUB': 'BBCC',
  RIDEAU: 'RCC',
  'RIDEAU CANOE CLUB': 'RCC',
  'OTTAWA RIVER': 'ORCC',
  'OTTAWA RIVER CANOE CLUB': 'ORCC',
  MISSISSAUGA: 'MCC',
  'MISSISSAUGA CANOE CLUB': 'MCC',
  'CARLETON PLACE': 'CPCC',
  'CARLETON PLACE CANOE CLUB': 'CPCC',
  CPC: 'CPCC', // same club, missing the second "C" for "Club"
  'RICHMOND HILL': 'RHCC',
  'RICHMOND HILL CANOE CLUB': 'RHCC',
  'NORTH BAY': 'NBCC',
  'NORTH BAY CANOE CLUB': 'NBCC',
  COBOURG: 'CDBCC',
  'COBOURG DISTRICT BOAT AND CANOE CLUB': 'CDBCC',
  GANANOQUE: 'GCC',
  'GANANOQUE CANOE & MOTORBOAT CLUB': 'GCC',
  PETERBOROUGH: 'PCKC',
  'PETERBOROUGH CANOE AND KAYAK CLUB': 'PCKC',
  SUDBURY: 'SCC',
  'SUDBURY CANOE CLUB': 'SCC',
  // Unlike the four above, this acronym was never actually seen in the real
  // sheet (only the full name was) — SNCC is this same letters-of-the-name
  // method applied on faith, not confirmed against an observed abbreviation.
  'SOUTH NIAGARA': 'SNCC',
  'SOUTH NIAGARA CANOE CLUB': 'SNCC',
}

/** The inverse of CLUB_CODES, for the one place a full name is still wanted
 * — ClubLegend. Built by hand rather than derived from CLUB_CODES because
 * that map is many-aliases-to-one-acronym; this is deliberately one full
 * name per acronym. Acronyms with no confidently-known full name (PICC,
 * SLCC — real codes seen in other regattas' sheets, never expanded anywhere)
 * are left out rather than guessed. */
export const CLUB_LEGEND = {
  BCC: 'Burloak Canoe Club',
  BBCC: 'Balmy Beach Canoe Club',
  RCC: 'Rideau Canoe Club',
  ORCC: 'Ottawa River Canoe Club',
  MCC: 'Mississauga Canoe Club',
  CPCC: 'Carleton Place Canoe Club',
  RHCC: 'Richmond Hill Canoe Club',
  NBCC: 'North Bay Canoe Club',
  CDBCC: 'Cobourg District Boat and Canoe Club',
  GCC: 'Gananoque Canoe & Motorboat Club',
  PCKC: 'Peterborough Canoe and Kayak Club',
  SCC: 'Sudbury Canoe Club',
  SNCC: 'South Niagara Canoe Club',
}

function normalizeClub(club) {
  const trimmed = normalize(club)
  return CLUB_CODES[trimmed.toUpperCase()] ?? trimmed
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

/** True for a row that starts a CKO-format race block: the literal word
 * "Race" alone in column 0. Unlike every other format, the race *number*
 * isn't on this row at all — it's alone on the next non-blank row, with the
 * event name (column 1, heat/distance still embedded) and scheduled time
 * (column 2) here instead. */
function isCkoEventRow(cells) {
  return normalizeKey(cells[0]) === 'RACE'
}

/** CKO's schedule and draw tabs both fold distance and heat into the event
 * string ("U16 Women's C2 500m Final A") rather than giving either its own
 * column — split them back out so `event`/`heat`/`distance` match every
 * other format's shape, and so boatTypeFromEvent (which just reads the
 * event's last word) still lands on the boat class. The heat descriptor is
 * kept whole (including odd suffixes like "Final 1 - Timed Final") rather
 * than parsed further. */
function splitCkoEventDetails(rawEvent) {
  const match = rawEvent.match(/^(.*?)\s+(\d+m)\s+(.+)$/i)
  if (!match) return { event: rawEvent, heat: '', distance: '' }
  return { event: match[1].trim(), distance: match[2], heat: match[3].trim() }
}

/** CKO crews mix three different delimiters within the same sheet — plain
 * commas, "and", and "/" — sometimes even within the same crew string (e.g.
 * "Anna Andrus/Chloe Andrus/Zara Dew, Aurora McWilliam"). Splitting on all
 * three at once (rather than picking one like Rideau's splitRideauNames)
 * is the only way to handle that mixed case; \b keeps "and" from matching
 * inside a name like "Anderson". */
function splitCkoNames(namesCell) {
  return namesCell
    .split(/\s*(?:\/|,|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
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

/** CKO's draw tab: a "Race,<event>,<time>" header row, then the race
 * *number* alone on the next non-blank row (nowhere else does this), then a
 * "Lane,Crew,Club,Finish,Time" header, then ten always-present lane rows
 * (0–9) that are simply blank if no crew is entered in that lane. The tab
 * also has a handful of fully-blank template blocks trailing the real
 * schedule (an empty "Race" row with no event name at all) — those are
 * skipped outright, not turned into a race with no name. A per-club overall
 * standings table sits off to the right of every row; since this parser
 * only ever reads columns 0–4 it's never even looked at. */
function parseCkoResultsSection(rows) {
  const blocks = []
  let current = null
  let pendingBlock = null
  let currentDay

  for (const row of rows) {
    const cells = row.map(normalize)
    if (cells.every((c) => c === '')) continue

    const dayMatch = matchDayDivider(cells)
    if (dayMatch !== null) {
      currentDay = dayMatch
      continue
    }

    if (isCkoEventRow(cells)) {
      current = null
      pendingBlock = null
      const rawEvent = cells[1] || ''
      if (!rawEvent) continue // an empty template block — nothing was ever filled in
      pendingBlock = { ...splitCkoEventDetails(rawEvent), time: cells[2] || '' }
      continue
    }

    if (pendingBlock) {
      const raceCell = cells[0]
      const raceNumber = parseInt(raceCell, 10)
      if (Number.isInteger(raceNumber) && String(raceNumber) === raceCell) {
        current = { raceNumber, ...pendingBlock, day: currentDay, lanes: [] }
        blocks.push(current)
      }
      pendingBlock = null
      continue
    }

    if (normalizeKey(cells[0]) === 'LANE') continue // "Lane,Crew,Club,Finish,Time" — fixed layout, nothing to map
    if (!current) continue

    const namesCell = cells[1] || ''
    if (!namesCell) continue // one of the ten pre-listed lanes with no crew entered

    current.lanes.push({
      laneNumber: cells[0] || '',
      names: splitCkoNames(namesCell),
      // Interclub crews are usually "/"-separated, but at least one real
      // lane used ", " instead ("NBCC, PCKC") — split on both so that isn't
      // read back as one club literally named "NBCC, PCKC".
      clubs: (cells[2] || '').split(/[/,]/).map(normalizeClub).filter(Boolean),
      time: cells[4] || '',
      finish: cells[3] || '',
      points: '',
    })
  }

  const map = new Map()
  for (const block of blocks) map.set(block.raceNumber, block)
  return map
}

/** Scans the draw/results tab's first ~10 rows for a Rideau or CKO race
 * block header (see isRideauEventRow / isCkoEventRow). Defaults to EOD when
 * nothing matches. CKO's block structure is present from the moment the
 * draw is drafted — the "Race,<event>,<time>" header rows exist whether or
 * not any lane has actually finished — so this sniffs reliably even before
 * race day, unlike a format that only reveals itself once results land. */
function sniffResultsFormat(rows) {
  const limit = Math.min(10, rows.length)
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map(normalize)
    if (isRideauEventRow(cells)) return 'rideau'
    if (isCkoEventRow(cells)) return 'cko'
  }
  return 'eod'
}

/** Sniffs from whichever tab actually has content — a Rideau regatta with no
 * results posted yet would otherwise default to EOD (since sniffResultsFormat
 * finds nothing to match) and fail to parse its own schedule on race morning. */
function detectFormat(scheduleRows, resultsRows) {
  const resultsFormat = sniffResultsFormat(resultsRows)
  if (resultsFormat === 'rideau' || resultsFormat === 'cko') return resultsFormat

  const scheduleLooksRideau = scheduleRows.some((row) => {
    const map = findColumnMap(row, RIDEAU_SCHEDULE_ALIASES)
    return map.age !== undefined && map.gender !== undefined && map.boat !== undefined
  })
  return scheduleLooksRideau ? 'rideau' : 'eod'
}

/** CKO's schedule tab shares the exact same headers as EOD's (Race #/Event/
 * Time), so it's parsed with the same parseScheduleSection — this just
 * splits the heat and distance back out of each entry's raw event string
 * afterwards, the same way the draw tab's blocks already are. */
function applyCkoEventSplit(scheduleMap) {
  for (const entry of scheduleMap.values()) {
    const { event, heat, distance } = splitCkoEventDetails(entry.event)
    entry.event = event
    entry.heat = heat
    entry.distance = distance
  }
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

  let scheduleMap, scheduleOrder, title, resultsMap
  if (format === 'rideau') {
    ;({ scheduleMap, scheduleOrder, title } = parseRideauScheduleSection(scheduleRows))
    resultsMap = parseRideauResultsSection(resultsRows)
  } else if (format === 'cko') {
    ;({ scheduleMap, scheduleOrder, title } = parseScheduleSection(scheduleRows))
    applyCkoEventSplit(scheduleMap)
    resultsMap = parseCkoResultsSection(resultsRows)
  } else {
    ;({ scheduleMap, scheduleOrder, title } = parseScheduleSection(scheduleRows))
    resultsMap = parseResultsSection(resultsRows)
  }

  const entries = mergeSections(scheduleOrder, scheduleMap, resultsMap)
  const clubs = extractUniqueClubs(entries)

  return { title, entries, parsedAt: Date.now(), clubs }
}
