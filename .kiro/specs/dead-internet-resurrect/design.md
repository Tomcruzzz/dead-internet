# Design — Dead Internet: RESURRECT (Milestone 1)

## Goal

Prove the core loop — URL + date → closest archive snapshot → safe in-app rendering
with provenance — as a minimal, reliable technical proof of concept. No MUTATE, no 404
AI, no provenance scoring, no timeline, no visual theming.

See `.kiro/steering/dead-internet.md` for cross-cutting safety rules and the empirical
Wayback findings this design is based on.

## Architecture overview

Next.js (App Router) + TypeScript + Tailwind. One API route, one primary page, no
database, no auth.

```
app/
  layout.tsx
  page.tsx                      # homepage: form → loading → result(metadata + iframe)
  api/
    resurrect/
      route.ts                  # POST: validate → CDX → pick closest → response
components/
  ResurrectForm.tsx             # URL + date inputs, client validation, submit
  LoadingSequence.tsx           # CONTACTING THE DEAD… / SEARCHING ARCHIVES… / SNAPSHOT FOUND
  SnapshotMeta.tsx              # metadata + provenance panel
  SnapshotFrame.tsx             # sandboxed cross-origin iframe viewer
lib/
  types.ts                      # shared request/response/error types
  wayback.ts                    # CDX client, URL normalization, closest selection, playback URLs
  cdx-cache.ts                  # in-memory TTL cache for CDX responses
  errors.ts                     # typed error model + http status mapping
```

## Data flow

```
 User input (URL + date)
        │
        ▼
 [app/page.tsx] ResurrectForm  ──client validation──►  (invalid → inline error, stop)
        │  POST { url, date }
        ▼
 [app/api/resurrect/route.ts]
        │  normalize URL + parse target date
        ▼
 [lib/wayback.ts] queryWaybackCdx(url, from, to)
        │  GET web.archive.org/cdx/search/cdx
        │    ?url=<url>&from=<YYYYMMDD>&to=<YYYYMMDD>
        │    &output=json&filter=statuscode:200&filter=mimetype:text/html&limit=<n>
        │  (on empty → retry www/variant)
        ▼
 CDX rows: [urlkey, timestamp(14-digit UTC), original, mimetype, statuscode, digest, length]
        │
        ▼
 selectClosestSnapshot(rows, targetDate)
        │  filter mimetype=text/html & statuscode=200
        │  parse each timestamp → Date; pick min |snapshot - target|
        │  ties → earliest capture
        ▼
 ResurrectResponse {
   status: "found",
   snapshot: { timestamp, displayDate, originalUrl, httpStatus, mimetype, digest, distanceDays },
   playback: { iframeUrl: ".../web/<ts>if_/<url>", canonicalUrl: ".../web/<ts>/<url>" },
   source: "Internet Archive Wayback Machine"
 }
        │
        ▼
 [app/page.tsx] render SnapshotMeta + SnapshotFrame(iframeUrl)
        │  sandbox="allow-scripts"  (no allow-same-origin, no allow-top-navigation)
        ▼
 archived page renders cross-origin inside the app
```

Error branches return `ResurrectResponse { status: "no_snapshot" | "archive_unavailable" | "invalid_input", message }`
and the UI renders the matching state.

## Safe rendering strategy

- Render the archived page in a **sandboxed cross-origin `<iframe>`** whose `src` is
  Wayback's playback URL in `if_` form: `https://web.archive.org/web/<timestamp>if_/<originalUrl>`.
- Cross-origin (archive.org) → the archived page cannot reach our app's DOM, storage, or origin.
- Wayback sets its own CSP restricting resource origins to `archive.org` family domains, so the archived page's network egress is already constrained.
- Our iframe `sandbox="allow-scripts"`: lets archived interactivity work while blocking
  top-navigation, popups, forms, presentation, etc. We deliberately omit
  `allow-same-origin` (never combine `allow-scripts` + `allow-same-origin` for untrusted content).
- `SnapshotFrame` exposes an optional "static safe mode" that renders with `sandbox=""`
  (no scripts) for maximum safety on pages that render server-side.
- We never fetch, parse, or inject archived HTML into our app's own DOM in Milestone 1.
  (That is a Milestone 3 concern for MUTATE and requires a full rewriting proxy + sanitizer.)
- If the iframe fails to load (onError / timeout), show an in-app "snapshot could not be rendered" message; the provenance link still lets the user open it directly on Wayback.

## Archive API details

**CDX Server API** (primary):

```
GET https://web.archive.org/cdx/search/cdx
    ?url=<originalUrl>
    &from=<YYYYMMDD>           # target date minus window
    &to=<YYYYMMDD>             # target date plus window
    &output=json
    &filter=statuscode:200
    &filter=mimetype:text/html
    &limit=<n>                 # cap result volume
    &collapse=timestamp:6      # optional: dedup to ~one capture per month (used for timeline later)
```

Response (JSON, first row is the header): each subsequent row is
`[urlkey, timestamp, original, mimetype, statuscode, digest, length]`.
`timestamp` is a 14-digit UTC `YYYYMMDDhhmmss`.

Verified example (youtube.com, June 2007) returned rows such as:
`["com,youtube)/", "20070601120905", "http://youtube.com/", "text/html", "200", "<digest>", "12557"]`.

**Availability API** (`archive.org/wayback/available`) is NOT used for lookup — verified
unreliable (returned empty for a URL+date that CDX resolves). It may optionally be used
only as a secondary cross-check, never as the primary path.

## Closest-snapshot selection algorithm

1. Filter rows to `mimetype === "text/html"` and `statuscode === "200"`.
2. Parse each `timestamp` (14-digit UTC) to a `Date`.
3. Parse the requested `date` (YYYY or YYYY-MM or YYYY-MM-DD) to a target `Date` (missing
   parts default to start-of-period; for YYYY → Jan 1, for YYYY-MM → day 1).
4. Compute distance = `Math.abs(snapshotDate - targetDate)` in milliseconds.
5. Select the row with the minimum distance. On a tie, select the earliest `timestamp`.
6. `distanceDays` = round(distance / 86_400_000).
7. If no rows remain after filtering, return "no snapshot found".

## URL handling / normalization

- If the input has no scheme, default to `http://` (historical captures are mostly http).
- Use the user's URL as-is for the first CDX query (exact match).
- If the first query returns no rows, retry with variants: toggle `www.`, and try the
  bare host. Query a modest window (e.g. ±6 months) so variant results stay small.
- Record which variant matched so the displayed original URL matches what was archived.
- Future improvement (not MVP): `matchType=host`/`domain` fallback and deeper normalization.

## Error model (`lib/errors.ts`)

Typed, serializable to the client:

| Type                | HTTP | Meaning                                          |
|---------------------|------|--------------------------------------------------|
| `invalid_input`     | 400  | URL/date failed validation                       |
| `no_snapshot`       | 200  | No usable HTML/200 snapshot in the window        |
| `archive_unavailable`| 502 | CDX request failed or timed out                  |
| `no_html_snapshot`  | 200  | Captures exist but none are text/html 200        |

The API always returns a `ResurrectResponse` with a `status` discriminator, never throws to the client.

## Caching (`lib/cdx-cache.ts`)

- In-memory TTL cache (no DB). Key: `<normalizedUrl>|<from>|<to>|<variant>`.
- TTL ~15 minutes (Wayback snapshots are immutable for a given timestamp, so this is safe).
- Caps repeat load on the same inputs during a demo and reduces load on the CDX API.

## Testing strategy

- **Unit** (`lib/wayback.ts`): closest-snapshot selection (tie-break, filtering non-html/
  non-200, empty), URL normalization, playback URL construction (`if_` vs canonical).
- **Integration** (`/api/resurrect`): mock the CDX fetch; assert `found`, `no_snapshot`,
  `archive_unavailable`, and `invalid_input` responses.
- **Manual e2e checklist**: `youtube.com` + `2007-06-15` (expect a found June 2007 snapshot);
  a never-archived URL (expect `no_snapshot`); a far-future date (expect `no_snapshot`);
  disconnect/timeout simulation (expect `archive_unavailable`); verify the iframe loads
  the archived page and the provenance link opens Wayback.

Use Vitest for unit/integration tests (single-run, `vitest --run`).

## Out of scope for Milestone 1

MUTATE engine, 404 AI historian, snapshot integrity scoring, ARCHIVED/RECOVERED/AI/
SIMULATED provenance tiering beyond the basic "sourced from Wayback" label, the
persistent timeline browser, CRT/Haunted/Halloween visual design, "I'm Feeling Unlucky",
and any backend fetch/rewrite of archived HTML. These belong to later milestones and specs.
