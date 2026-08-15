/**
 * Finds the race to land on when the page first opens during a live event:
 * the highest race number that already has results, i.e. the most recently
 * completed race. Returns null if no race has results yet (the very start of
 * the day) or there are no races at all, so the caller can leave the page at
 * the top instead of forcing a scroll to nothing meaningful.
 *
 * Takes the maximum race *number* with results rather than the last one by
 * array position — sheet data in this app isn't always in strict race-number
 * order (ghost rows, manual re-entry), so relying on position instead of the
 * number itself could land on the wrong race.
 */
export function findLastCompletedRaceNumber(entries) {
  const completedRaceNumbers = (entries ?? [])
    .filter((e) => e.type === 'race' && e.hasResults)
    .map((e) => e.raceNumber)

  if (completedRaceNumbers.length === 0) return null
  return Math.max(...completedRaceNumbers)
}
