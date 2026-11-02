# Dead Internet — Product & Architecture Guide

Project: **DEAD INTERNET** — "The web forgets. We don't."
Context: Kiroween 2026 hackathon project, built with Kiro.

This steering file is always included in context. It captures the product vision,
cross-cutting architecture decisions, and the milestone roadmap so every session
shares the same understanding. Milestone-specific detail lives in each milestone's
spec under `.kiro/specs/<milestone-name>/`.

## Product vision

A time machine for the internet — an interactive browser for exploring the past web
and transforming the modern web into alternate eras/themes. Three systems:

1. **RESURRECT** — browse the web as it existed in the past. URL + date → closest
   archive snapshot → safe in-app experience with a timeline.
2. **MUTATE** — transform a modern website into an alternate era/reality (1995 Web,
   2000 Web, Win95/98, CRT, Terminal, Haunted, Halloween, Zombie, Post-Apocalypse).
   Not merely a CSS color filter: analyze page structure and intelligently transform
   presentation (typography, layout, borders, buttons, navigation, imagery, cursor,
   microcopy) while preserving content and useful functionality where possible.
3. **404** — an AI historian "ghost" living in the browser that explains what you are
   looking at, contextual to the current URL, requested date, snapshot date, page
   content, and available/missing assets. Useful and contextual, not a generic chatbot.

## Provenance principles (core product values)

Never silently present AI-generated or reconstructed content as authentic. Every
piece of content carries a provenance tier, and the UI must always make the tier visible:

- **ARCHIVED** — directly recovered historical material.
- **RECOVERED** — reconstructed from other historical evidence (e.g., nearby snapshots).
- **AI RECONSTRUCTION** — generated approximation.
- **SIMULATED** — creative interpretation.

Historical accuracy and provenance are core product principles. Prefer recovery from
legitimate historical evidence before any AI reconstruction.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Server-side API routes for archive lookups and (later) transformations.
- An LLM/API added later only for 404 and intelligent transformations.
- For the hackathon: NO authentication, NO user accounts, NO payments, NO mobile apps,
  NO social features, NO large database infrastructure. Prioritize a polished, reliable
  demonstration over production-scale architecture.

## Safe rendering of archived/historical content (mandatory)

Arbitrary historical web content is dangerous: archived JavaScript, XSS, tracking,
mixed content, broken resources, URL-rewriting escapes, and navigation leaving the app.
Rules that apply across all milestones:

- NEVER inject arbitrary remote HTML/CSS/JS into the Dead Internet application's own
  DOM/origin.
- Render archived/historical pages in a **sandboxed cross-origin iframe** pointed at
  the archive's playback URL. The cross-origin boundary isolates archived content from
  our app's DOM, storage, and origin.
- On the iframe `sandbox`, NEVER combine `allow-scripts` + `allow-same-origin` for
  untrusted content. Default to `sandbox="allow-scripts"` (interactive but isolated),
  with a `sandbox=""` "static safe mode" fallback that runs no scripts at all.
- Always show provenance: the source archive and a canonical link to the snapshot.
- The MVP uses Wayback's own playback URL (`web.archive.org/web/<timestamp>if_/<url>`)
  so Wayback performs URL rewriting and sub-resource resolution for us. Fetch/rewrite
  in our own backend is deferred until MUTATE requires DOM control (Milestone 3+).

## Archive data sources

Primary: **Internet Archive Wayback Machine** (no API key required for read APIs).

- **CDX Server API** — `https://web.archive.org/cdx/search/cdx` — primary source for
  finding snapshots near a date. Verified working. Returns per-capture rows of
  `urlkey, timestamp, original, mimetype, statuscode, digest, length`. Use
  `output=json`, `from`/`to` date filters, `filter=statuscode:200`,
  `filter=mimetype:text/html`, and `collapse` for timeline dedup (e.g.
  `collapse=timestamp:6` ≈ one per month). Cache aggressively; respect rate limits.
- **Availability API** — `https://archive.org/wayback/available?url=&timestamp=` —
  secondary/cross-check only. Verified UNRELIABLE: it returned empty for
  `youtube.com` + `20070615` even though CDX returned snapshots on each surrounding day.
  Do not depend on it for date-targeted lookups.
- **Playback** — `https://web.archive.org/web/<timestamp>if_/<url>` serves the archived
  page WITHOUT the Wayback toolbar (for iframe embedding). Verified: sets no
  `X-Frame-Options` and a `Content-Security-Policy` restricting resource origins to
  `archive.org` family domains, so archived pages can be embedded and their network
  egress is already constrained by Wayback. The `id_` variant serves raw archived
  content without URL rewriting (not for general playback).

Future fallback: Memento / TimeTravel aggregator (`timetravel.mementoweb.org`) to span
multiple archives. Skip Archive.today (no clean public API).

### Empirical verification (2026-11)

- Availability API for `youtube.com` + `timestamp=20070615` → empty `archived_snapshots`.
- CDX API for `youtube.com`, `from=20070601&to=20070701`, `filter=statuscode:200` →
  returned multiple `text/html` 200 snapshots with 14-digit UTC timestamps
  (e.g. `20070601120905`) and content `digest`/`length`.
- Archived page `https://web.archive.org/web/20070601120905if_/http://youtube.com/`
  → `X-Frame-Options: (none)`, `Content-Security-Policy: default-src 'self'
  'unsafe-eval' 'unsafe-inline' data: blob: archive.org web.archive.org ...`,
  `Content-Type: text/html; charset=utf-8`, plus `X-Archive-Src` provenance.

## Milestone roadmap

- **Milestone 1 — RESURRECT POC:** URL + date → closest snapshot → safe in-app render +
  provenance. Active spec: `.kiro/specs/dead-internet-resurrect/`.
- **Milestone 2 — Timeline browser + provenance/integrity:** persistent timeline over a
  site's history; snapshot integrity scoring (HTML/CSS/text/images/scripts counts) and
  the ARCHIVED/RECOVERED provenance tiers.
- **Milestone 3 — MUTATE engine:** structural transformation (not just CSS). Scope to be
  defined in its own spec; likely allowlisted/controlled pages first, because live-site
  fetching is CORS-blocked and legally/technically fragile for arbitrary sites.
- **Milestone 4 — 404 AI historian:** contextual LLM character.
- **Milestone 5 — Kiroween visual design:** cinematic/creepy homepage, CRT, Haunted/
  Halloween themes, "I'm Feeling Unlucky". Visual polish comes AFTER the core loop works.

## Kiro workflow conventions for this project

- One spec per milestone under `.kiro/specs/<milestone-name>/`, containing
  `requirements.md` (EARS: WHEN … THE SYSTEM SHALL …), `design.md`, `tasks.md`.
- `tasks.md` uses numbered IDs (e.g. `2.3`) with dependencies noted inline; mark optional
  tasks with `[optional]`. Reference tasks in chat by ID; run a milestone via the spec
  task-execution view.
- Cross-milestone architectural decisions live here (steering); milestone-specific design
  lives in the spec's `design.md`.
- Commit/milestone decisions only when the user explicitly asks.
