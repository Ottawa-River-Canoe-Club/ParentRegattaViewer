/** Title-cases values that come in ALL CAPS (as the results section's Event rows
 * do), while leaving already mixed-case values (as the schedule section uses)
 * untouched, so we never mangle a name that was already formatted correctly. */
export function toDisplayCase(value) {
  const str = (value ?? '').toString()
  const letters = str.replace(/[^A-Za-z]/g, '')
  if (!letters) return str

  const upperCount = (letters.match(/[A-Z]/g) || []).length
  if (upperCount / letters.length < 0.8) return str

  return str.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

export function formatNames(names) {
  return (names ?? []).join(', ')
}

export function formatClubs(clubs) {
  return (clubs ?? []).join(' / ')
}
