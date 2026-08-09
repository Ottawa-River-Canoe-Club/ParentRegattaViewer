/**
 * Finds the race to land on when the page first opens: the race right after
 * the most recent one with results, i.e. the one presumably on the water
 * now. Falls back to the last race itself if the regatta is over (nothing
 * follows it), or the first race if nothing has results yet.
 */
export function findCurrentRaceNumber(entries) {
  const races = (entries ?? []).filter((e) => e.type === 'race')
  if (races.length === 0) return null

  const lastCompletedIdx = races.reduce((last, race, idx) => (race.hasResults ? idx : last), -1)
  if (lastCompletedIdx === -1) return races[0].raceNumber
  if (lastCompletedIdx === races.length - 1) return races[lastCompletedIdx].raceNumber
  return races[lastCompletedIdx + 1].raceNumber
}
