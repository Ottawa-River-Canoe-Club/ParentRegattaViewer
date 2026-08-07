import Fuse from 'fuse.js'

/**
 * Builds a fuzzy search index over every distinct athlete name that appears in
 * the schedule, plus a list of "identities" used only to power disambiguation.
 *
 * For mixed-club boats (CLUB = "ORCC/CPCC") we cannot know from the data which
 * specific athlete belongs to which specific club, so rather than guessing a
 * (likely wrong) positional pairing, each name in that boat is recorded with
 * the full composite club string. Two identities are only genuinely ambiguous
 * (different people) if their club sets don't overlap at all — see
 * findDisambiguationCandidates, which merges variants that share a club.
 */
export function buildSearchIndex(entries) {
  const nameSet = new Set()
  const identityMap = new Map()

  for (const entry of entries) {
    if (entry.type !== 'race') continue
    for (const lane of entry.lanes) {
      const clubLabel = lane.clubs.join('/')
      for (const name of lane.names) {
        nameSet.add(name)
        const key = `${name.toLowerCase()}||${clubLabel.toLowerCase()}`
        if (!identityMap.has(key)) identityMap.set(key, { name, club: clubLabel })
      }
    }
  }

  const names = [...nameSet]
  const fuse = new Fuse(names, {
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })

  return { fuse, identities: [...identityMap.values()] }
}

export function getMatchedNameSet(index, query) {
  const q = (query ?? '').trim()
  if (q.length < 2) return new Set()
  return new Set(index.fuse.search(q).map((r) => r.item.toLowerCase()))
}

function clubTextMatches(club, query) {
  const cl = (club ?? '').toLowerCase()
  const q = (query ?? '').trim().toLowerCase()
  if (!cl || !q) return false
  return cl.includes(q) || q.includes(cl)
}

/** Boat-as-a-whole match: true if the query hits any crew member's name or any
 * club in a (possibly mixed) boat's club list. */
export function laneMatchesQuery(lane, query, matchedNameSet) {
  const q = (query ?? '').trim()
  if (!q) return false
  if (lane.clubs.some((c) => clubTextMatches(c, q))) return true
  return lane.names.some((n) => matchedNameSet.has(n.toLowerCase()))
}

/** Precise match against a disambiguated identity: same name, and the boat
 * shares at least one club with the identity (handles an athlete who
 * sometimes races solo and sometimes in a mixed crew). */
export function laneMatchesIdentity(lane, identity) {
  if (!identity) return false
  const nameHit = lane.names.some((n) => n.toLowerCase() === identity.name.toLowerCase())
  if (!nameHit) return false
  if (!identity.club) return true
  const identityClubs = identity.club.split('/').map((c) => c.trim().toLowerCase())
  return lane.clubs.some((c) => identityClubs.includes(c.toLowerCase()))
}

/**
 * Returns distinct-athlete candidates worth disambiguating for the current
 * query. Variants of the same name that share a club are merged (same kid,
 * different boat mixes); only name-alikes with no club in common are surfaced
 * as separate people.
 */
export function findDisambiguationCandidates(index, query) {
  const q = (query ?? '').trim()
  if (q.length < 3) return []

  const matchedNames = getMatchedNameSet(index, q)
  if (matchedNames.size === 0) return []

  const raw = index.identities.filter((identity) => matchedNames.has(identity.name.toLowerCase()))

  const byName = new Map()
  for (const identity of raw) {
    const nameKey = identity.name.toLowerCase()
    if (!byName.has(nameKey)) byName.set(nameKey, [])
    byName.get(nameKey).push(identity)
  }

  const candidates = []
  for (const variants of byName.values()) {
    // Each group keeps the club labels in their original display case, plus a
    // lowercase view used only to decide whether two variants are the same athlete.
    const groups = []
    for (const variant of variants) {
      const originalClubs = variant.club ? variant.club.split('/').map((c) => c.trim()) : []
      const lowerClubs = originalClubs.map((c) => c.toLowerCase())
      const existing = groups.find(
        (g) => g.lowerClubs.some((c) => lowerClubs.includes(c)) || (lowerClubs.length === 0 && g.lowerClubs.length === 0),
      )
      if (existing) {
        originalClubs.forEach((club, i) => {
          if (!existing.lowerClubs.includes(lowerClubs[i])) {
            existing.lowerClubs.push(lowerClubs[i])
            existing.originalClubs.push(club)
          }
        })
      } else {
        groups.push({ name: variant.name, lowerClubs, originalClubs })
      }
    }
    for (const g of groups) {
      const club = g.originalClubs.join('/')
      candidates.push({ name: g.name, club, id: `${g.name.toLowerCase()}||${club.toLowerCase()}` })
    }
  }

  return candidates
}

/** Annotates each race entry (and its lanes) with whether it matches the
 * current query or disambiguated identity, for filtering + highlighting. */
export function annotateEntries(entries, { query, selectedIdentity, matchedNameSet }) {
  return entries.map((entry) => {
    if (entry.type !== 'race') return entry
    const lanes = entry.lanes.map((lane) => {
      const matched = selectedIdentity
        ? laneMatchesIdentity(lane, selectedIdentity)
        : laneMatchesQuery(lane, query, matchedNameSet)
      return { ...lane, matched }
    })
    return { ...entry, lanes, matched: lanes.some((l) => l.matched) }
  })
}
