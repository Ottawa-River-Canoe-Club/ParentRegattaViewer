# RegattaParent

A mobile-first web app for parents at canoe/kayak regattas. It reads a host
club's live schedule + results spreadsheet (published as CSV from Google
Sheets) and turns it into a searchable, auto-updating race day view — built
for a phone in bright sun with unreliable cell service.

A public directory lists active regattas; each one gets its own live
dashboard at `/regatta/:id`. An admin portal at `/admin` (Google sign-in,
restricted to club admins) manages which regattas are listed.

## Features

- **Regatta directory** (`/`) — public list of active regattas, with a toggle to reveal archived ones.
- **Live sync** (`/regatta/:id`) — polls the published CSVs every 60s and re-renders in place, no refresh needed.
- **Fuzzy search** — typo-tolerant athlete search (e.g. "Zack" finds "Zach") plus club-code search, via [Fuse.js](https://www.fusejs.io/). Multi-word queries are matched word-by-word so a full name like "Ben Cooper" won't also match an unrelated athlete who merely shares a surname.
- **Athlete disambiguation** — if a name matches more than one distinct athlete (different clubs), you're prompted to pick which one.
- **Interclub crews** — mixed-club boats (e.g. `ORCC/CPCC`) are matched as a whole, so searching either club or any crew member's name finds the boat.
- **Offline fallback** — the last successful fetch is cached in `localStorage` per regatta, so the schedule stays visible if service drops, with a manual refresh button.
- **Quick filters** — All Races / Filtered Results / Live Results toggle chips.
- **Admin portal** (`/admin`) — Google-authenticated, restricted to `@orcc.ca` accounts plus any email added to the `allowed_admins` table. Add regattas (pasting sheet URLs — the sheet ID and results tab's gid are parsed out automatically), toggle active/archived, and manage the admin allowlist.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql). This creates the `regattas` and `allowed_admins` tables, and — this is the part that actually matters — the Row Level Security policies that enforce admin-only writes. The client-side "Unauthorized" screen is just a UX nicety; RLS is the real access boundary and can't be bypassed by anyone poking at the exposed anon key from the browser console.
3. In Project Settings → API, copy the Project URL and anon public key into a `.env` file (copy `.env.example` to start):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

### 2. Google sign-in for the admin portal

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID (Application type: Web application).
2. In Supabase: Authentication → Providers → Google → paste your Google Client ID and Client Secret, and enable the provider. Supabase's Google provider page shows the exact **Callback URL** to add as an Authorized redirect URI back in Google Cloud Console — copy it from there rather than guessing, since it's specific to your project.
3. In Supabase: Authentication → URL Configuration, add `http://localhost:5173` (and your production URL, once deployed) to the Site URL / Redirect URLs allow-list, or the post-login redirect back to `/admin` will be rejected.
4. Anyone signing in with an `@orcc.ca` Google account is automatically an admin — no manual step needed. To grant access to an external email, an existing admin adds it from the Admin Portal itself (`allowed_admins` table).

### 3. Run it

```bash
npm install
npm run dev
```

If `.env` isn't filled in yet, the app shows a setup screen instead of crashing.

## Data source & parsing

Each regatta's schedule and draw/results live on **two separate tabs** of the
same Google Sheet — a plain export URL only returns the first tab, so the app
fetches both tabs' CSV exports (the results tab via its `gid`) in parallel
and merges them by race number:

1. **Schedule tab** — `Time, Race #, Event, Heat #, Distance`, keyed by race number.
2. **Draw/Results tab** — repeating blocks of an `Event` row, a `LANE, NAME(S), CLUB, TIME, FINISH, POINTS` header, then one row per lane.

[src/lib/csvParser.js](src/lib/csvParser.js) detects columns by header text rather than fixed positions — the two tabs aren't even consistent with each other about a leading blank column, let alone across different clubs' sheets. If the results tab has no data yet (e.g. before the draw is posted), races simply show as "Not Yet Drawn" instead of failing.

[src/lib/search.js](src/lib/search.js) builds the fuzzy search index and disambiguation logic — see the code comments there for how mixed-club boats are handled without guessing which athlete belongs to which club.

[src/lib/googleSheets.js](src/lib/googleSheets.js) parses a pasted sheet URL down to its ID and gid (used by the Admin Portal's add-regatta form), and builds CSV export URLs back from them.

## Testing

```bash
npm run test   # vitest — CSV parsing, search/disambiguation, sheet URL parsing
npm run lint
npm run build
```

Supabase-backed data (auth, the regattas table) isn't covered by automated tests — it's thin wrapper code around network calls, verified by hand against a real project instead.

## Deployment note

This is a client-side SPA using browser routing (`/`, `/regatta/:id`, `/admin`). Whatever host you deploy to needs to serve `index.html` for all paths, not just `/` — e.g. a `_redirects` file for Netlify or a rewrite rule for Vercel/other static hosts.
