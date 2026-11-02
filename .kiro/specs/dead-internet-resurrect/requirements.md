# Requirements

## Scope

This spec covers **Milestone 1 (RESURRECT proof of concept)** of the Dead Internet
project. The goal is to prove the core loop:

> **URL + date → closest archive snapshot → safe in-app rendering with provenance.**

MUTATE, the 404 AI historian, provenance/integrity scoring, the timeline browser, and
Kiroween visual design are explicitly **out of scope** for this spec and will be
covered by follow-up specs (see `.kiro/steering/dead-internet.md` for the roadmap and
cross-cutting architecture/safety rules).

Milestone 1 is intentionally an "ugly technical proof of concept." No CRT animations,
Halloween styling, AI, databases, or advanced reconstruction.

## User stories

### US1 — Find a historical snapshot

WHEN a user submits a URL and a target date on the Dead Internet homepage
THE SYSTEM SHALL query a public web archive index (Internet Archive Wayback CDX) for
HTML snapshots of that URL near the target date

WHEN the archive index returns one or more HTML snapshots within the searched date window
THE SYSTEM SHALL select the snapshot whose capture timestamp is closest to the requested date

WHEN multiple snapshots are equally close to the requested date
THE SYSTEM SHALL deterministically select one (the earliest capture of the closest date) and record which one was chosen

WHEN the user supplies a URL without a scheme
THE SYSTEM SHALL normalize it (default scheme) before querying the archive

WHEN an exact match for the supplied URL returns no snapshots
THE SYSTEM SHALL retry with reasonable URL variants (e.g. with/without `www`) before concluding no snapshot exists

WHEN the archive index returns no snapshots for the URL within the date window
THE SYSTEM SHALL return a structured "no snapshot found" result and not throw

WHEN the archive index request fails or times out
THE SYSTEM SHALL return a structured "archive unavailable" error and not throw

### US2 — Render the snapshot safely

WHEN a snapshot is found
THE SYSTEM SHALL render the archived page inside the application in a sandboxed cross-origin iframe pointed at the archive's playback URL

WHEN the archived page is rendered
THE SYSTEM SHALL prevent it from navigating the top-level application window (no `allow-top-navigation`)

WHEN the archived page is rendered
THE SYSTEM SHALL NOT inject the archived HTML, CSS, or JavaScript into the Dead Internet application's own DOM or origin

WHEN the archived page is rendered
THE SYSTEM SHALL NOT combine `allow-scripts` and `allow-same-origin` on the sandbox iframe

WHEN the archive playback URL fails to load inside the iframe
THE SYSTEM SHALL show an in-app message indicating the snapshot could not be rendered

### US3 — Show snapshot metadata and provenance

WHEN a snapshot is found
THE SYSTEM SHALL display the actual snapshot date (not the requested date)

WHEN a snapshot is found
THE SYSTEM SHALL clearly distinguish the requested date from the actual snapshot date

WHEN a snapshot is found
THE SYSTEM SHALL display the original URL, the snapshot HTTP status, and the distance in days between the requested date and the actual snapshot date

WHEN a snapshot is found
THE SYSTEM SHALL provide a canonical provenance link to the snapshot on the Internet Archive Wayback Machine site ("View on Wayback Machine")

WHEN a snapshot is found
THE SYSTEM SHALL label the rendered content as sourced from the Internet Archive Wayback Machine

### US4 — Validation and edge handling

WHEN the user submits an invalid URL (not parseable as a domain/URL)
THE SYSTEM SHALL show a client-side validation error without making an archive request

WHEN the user submits an invalid or out-of-range date
THE SYSTEM SHALL show a client-side validation error without making an archive request

WHEN the closest candidate is a non-HTML resource or has a non-200 status
THE SYSTEM SHALL exclude it from selection and continue searching the window; if no usable HTML/200 snapshot exists, return "no snapshot found"

WHEN the user requests a date in the future or a URL that was never archived
THE SYSTEM SHALL return a clear "no snapshot found" result, not a crash

### US5 — Build and run

WHEN a developer runs the project
THE SYSTEM SHALL start with a single command and serve the homepage and the resurrect flow

WHEN the project is built
THE SYSTEM SHALL pass `npm run build` and `npm run lint` with no errors

## Milestone 1 acceptance criteria

1. Input `youtube.com` + `2007-06-15` returns a real Wayback snapshot timestamp close to
   that date, with the correct human-readable snapshot date.
2. The page renders inside the app in a sandboxed iframe (not a bare redirect to
   `web.archive.org`).
3. The metadata panel shows: snapshot date, original URL, HTTP status, distance in days
   from the requested date, and a "View on Wayback Machine" provenance link.
4. Requested date vs. actual snapshot date are visibly distinguished.
5. A never-archived URL (or a far-future date) shows a clean "no snapshot found" state —
   no crash, no unhandled exception.
6. An archive/network error (Wayback down or timeout) shows a clean "archive unavailable"
   state — no crash.
7. Non-HTML / non-200 captures are filtered out; if none remain, "no snapshot found" is shown.
8. No arbitrary remote HTML/CSS/JS is injected into the Dead Internet app's own DOM
   (only a cross-origin sandboxed iframe).
9. `npm run build` and `npm run lint` pass; the dev server serves the homepage and the
   full resurrect flow end-to-end.
