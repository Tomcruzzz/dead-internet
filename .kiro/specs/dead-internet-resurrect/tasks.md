# Tasks

Milestone 1 — RESURRECT proof of concept. Reference `.kiro/steering/dead-internet.md`
for cross-cutting safety/architecture rules and `requirements.md` / `design.md` in this
spec for detail. Tasks use numbered IDs; dependencies are noted inline; `[optional]`
tasks are skipped by "Run all Tasks".

## 1. Project scaffolding
- [ ] 1.1 Initialize Next.js (App Router) + TypeScript + Tailwind project in the workspace root
- [ ] 1.2 Verify dev server and build run; add npm scripts (`dev`, `build`, `lint`, `test`) (depends on 1.1)
- [ ] 1.3 Create folder structure (`lib/`, `components/`, `app/api/resurrect/`) and shared types in `lib/types.ts` (depends on 1.1)

## 2. Wayback integration (backend)
- [ ] 2.1 Implement CDX client in `lib/wayback.ts` — query with `url`, `from`, `to`, `output=json`, `filter=statuscode:200`, `filter=mimetype:text/html`, `limit`; parse JSON rows (depends on 1.3)
- [ ] 2.2 Implement URL normalization (scheme defaulting, www/variant fallback) (depends on 1.3)
- [ ] 2.3 Implement closest-snapshot selection (parse 14-digit timestamps to Date, filter html/200, pick min distance, tie → earliest) (depends on 2.1)
- [ ] 2.4 Construct playback URLs — `if_` form for the iframe, canonical form for the provenance link (depends on 2.1)
- [ ] 2.5 Implement typed error model in `lib/errors.ts` (`invalid_input`, `no_snapshot`, `archive_unavailable`, `no_html_snapshot`) (depends on 1.3)
- [ ] 2.6 Implement in-memory TTL cache in `lib/cdx-cache.ts` keyed by url+window+variant (depends on 2.1)

## 3. API route
- [ ] 3.1 Implement `POST /api/resurrect`: validate input → query CDX → select closest → return `ResurrectResponse` (status discriminator: `found`/`no_snapshot`/`archive_unavailable`/`invalid_input`/`no_html_snapshot`) (depends on 2.3, 2.4, 2.5)
- [ ] 3.2 Graceful handling of CDX timeout/network failure → `archive_unavailable` (never throw to client) (depends on 3.1)

## 4. Frontend — resurrect flow
- [ ] 4.1 Build `ResurrectForm` (URL input + date input + submit) with client-side validation (depends on 1.1)
- [ ] 4.2 Implement loading sequence states ("CONTACTING THE DEAD…", "SEARCHING ARCHIVES…", "SNAPSHOT FOUND") (depends on 4.1)
- [ ] 4.3 Build `SnapshotMeta` panel: snapshot date, requested date, original URL, HTTP status, distance in days, "View on Wayback Machine" provenance link, "sourced from Internet Archive" label (depends on 3.1)
- [ ] 4.4 Build `SnapshotFrame` sandboxed cross-origin iframe viewer (`sandbox="allow-scripts"`, no `allow-same-origin`, no `allow-top-navigation`) with iframe load-failure message + optional static-safe `sandbox=""` mode (depends on 3.1)

## 5. Wiring & end-to-end
- [ ] 5.1 Wire `ResurrectForm` → `POST /api/resurrect` → render `SnapshotMeta` + `SnapshotFrame` (depends on 4.3, 4.4, 3.1)
- [ ] 5.2 Handle all response statuses in the UI: `found`, `no_snapshot`, `archive_unavailable`, `invalid_input`, `no_html_snapshot`, and iframe load failure (depends on 5.1)

## 6. Tests
- [ ] 6.1 Unit tests: closest-snapshot selection (tie-break, non-html/non-200 filtering, empty) (depends on 2.3)
- [ ] 6.2 Unit tests: URL normalization + playback URL construction (depends on 2.4)
- [ ] 6.3 Integration tests for `/api/resurrect` with mocked CDX (found, no_snapshot, archive_unavailable, invalid_input) (depends on 3.1)
- [ ] 6.4 Manual e2e checklist: `youtube.com` + `2007-06-15`; a never-archived URL; a far-future date; timeout simulation; verify iframe + provenance link (depends on 5.2)

## 7. Polish [optional]
- [ ] 7.1 Add the homepage year-slider visual (non-functional styling only) [optional]
- [ ] 7.2 Add a short README with run instructions [optional]
