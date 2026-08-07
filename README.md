# RegattaParent

A mobile-first web app for parents at a canoe/kayak regatta. It reads a host
club's live schedule + results spreadsheet (published as CSV from Google
Sheets) and turns it into a searchable, auto-updating race day view — built
for a phone in bright sun with unreliable cell service.

## Features

- **Live sync** — polls the published CSV every 60s and re-renders in place, no refresh needed.
- **Fuzzy search** — typo-tolerant athlete search (e.g. "Zack" finds "Zach") plus club-code search, via [Fuse.js](https://www.fusejs.io/).
- **Athlete disambiguation** — if a name matches more than one distinct athlete (different clubs), you're prompted to pick which one.
- **Interclub crews** — mixed-club boats (e.g. `ORCC/CPCC`) are matched as a whole, so searching either club or any crew member's name finds the boat.
- **Offline fallback** — the last successful fetch is cached in `localStorage`, so the schedule stays visible if service drops, with a manual refresh button.
- **Quick filters** — All Races / Filtered Results / Live Results toggle chips.

## Data source & parsing

The source sheet has two sections in one CSV export:

1. **Schedule** (top) — `Time, Race #, Event, Heat #, Distance`, keyed by race number.
2. **Draw/Results** (bottom, after a `DRAWRESULTS` marker row) — repeating blocks of an `Event` row, a `LANE, NAME(S), CLUB, TIME, FINISH, POINTS` header, then one row per lane.

[src/lib/csvParser.js](src/lib/csvParser.js) detects columns by header text rather than fixed positions, so it tolerates the sheet's leading blank column and doesn't break if columns shift. It merges the two sections by race number into a single ordered list of race cards. If the `DRAWRESULTS` section isn't present yet (e.g. before the draw is posted — the sheet's current live state), races simply show as "Not Yet Drawn" instead of failing.

[src/lib/search.js](src/lib/search.js) builds the fuzzy search index and the disambiguation logic — see the code comments there for how mixed-club boats are handled without guessing which athlete belongs to which club.

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm run test   # vitest — parser + search logic, including synthetic multi-athlete/mixed-club fixtures
npm run lint
npm run build
```

## Configuration

The published CSV URL is set in [src/hooks/useRegattaData.js](src/hooks/useRegattaData.js) (`CSV_URL`). To point this at a different club's sheet, publish it as CSV (`File → Share → Publish to web`, or use the `/export?format=csv` link for a sheet shared as "Anyone with the link") and swap the URL there.
