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

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cells = rows[i].map(normalize)
    if (cells.every((c) => c === '')) continue

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
      })
      scheduleOrder.push({ type: 'race', raceNumber })
    } else {
      const label = [cells[colMap.time], cells[colMap.event], cells[colMap.heat], cells[colMap.distance]].find(
        (c) => c && c.length > 0,
      )
      if (label) scheduleOrder.push({ type: 'break', label })
    }
  }

  return { scheduleMap, scheduleOrder, title }
}

function parseResultsSection(rows) {
  const blocks = []
  let current = null
  let colMap = null

  for (const row of rows) {
    const cells = row.map(normalize)
    if (cells.every((c) => c === '')) continue

    const eventIdx = cells.findIndex((c) => c.toUpperCase() === 'EVENT')
    if (eventIdx !== -1) {
      const raceNumber = parseInt(cells[eventIdx + 1], 10)
      current = {
        raceNumber: Number.isInteger(raceNumber) ? raceNumber : null,
        eventName: cells[eventIdx + 2] || '',
        heat: normalizeHeat(cells[eventIdx + 3] || ''),
        distance: cells[eventIdx + 4] || '',
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
        .map((s) => s.trim())
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

function mergeSections(scheduleOrder, scheduleMap, resultsMap) {
  const entries = []
  const consumed = new Set()

  for (const item of scheduleOrder) {
    if (item.type === 'break') {
      entries.push({ type: 'break', label: item.label })
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
      lanes: result.lanes,
      hasDraw: result.lanes.length > 0,
      hasResults: result.lanes.some((l) => l.time || l.finish || l.points),
    })
  }

  return entries
}

/**
 * Parses the regatta's two source tabs — the schedule tab (Time/Race#/Event/
 * Heat#/Distance) and the draw/results tab (repeating Event + LANE blocks) —
 * into a single ordered list of race/break entries. The two tabs are fetched
 * as separate CSV exports (see useRegattaData), so each is parsed on its own
 * rather than split out of one combined document. Column positions are
 * detected from header text rather than assumed, since the two tabs aren't
 * even consistent with each other about a leading blank column.
 */
export function parseRegattaData(scheduleCsvText, resultsCsvText) {
  const { data: scheduleRows } = Papa.parse(scheduleCsvText ?? '', { skipEmptyLines: false })
  const { data: resultsRows } = Papa.parse(resultsCsvText ?? '', { skipEmptyLines: false })

  const { scheduleMap, scheduleOrder, title } = parseScheduleSection(scheduleRows)
  const resultsMap = parseResultsSection(resultsRows)
  const entries = mergeSections(scheduleOrder, scheduleMap, resultsMap)

  return { title, entries, parsedAt: Date.now() }
}
