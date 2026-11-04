# Dead Internet completion plan

Working agreement: complete one step at a time, verify the result, update this file
and the relevant milestone tasks, then commit and push to `main` after each step.
Do not mark live browser acceptance complete from mocked tests or HTTP checks.

## Milestone 1: finish RESURRECT

- [ ] 1. Verify the real archive flow and save acceptance evidence (task 6.4).
  - [x] Homepage serves successfully and the real YouTube lookup returns a capture.
  - [x] Repeatable HTTP checks for found, never archived, future, invalid input, playback.
  - [x] Browser: visible archived content, metadata, provenance link, retry/static mode; timeline error and empty-year recovery.
- [x] 2. Correct archive lookup accuracy and report the searched range (tasks 2.1, 2.3).
  Preserve individual capture timestamps; handle sparse archives and month boundaries;
  retain bounded requests, caching, and clear upstream failure states.
- [x] 3. Share URL/date validation between client and server (task 4.1).
- [x] 4. Finish playback recovery: retry, static safe mode, honest load status (4.4, 5.2).
- [ ] 5. Cover retries/timeouts, input validation, and frontend state transitions (6.1-6.4).
- [x] 6. Finish success/loading messaging, README, and reconcile specs/tasks (4.2, 7.2).
- [ ] 7. Pass final build/lint/tests and real browser acceptance. Close Milestone 1.

## Remaining product roadmap

Create requirements, design, and tasks for each milestone before implementation.

- [ ] Milestone 2: capture timeline, switching snapshots, visible provenance tiers,
  evidence-based integrity reporting (unknown asset completeness stays unknown).
- [ ] Milestone 3: MUTATE for a small set of controlled source pages and themes;
  structural transformations, isolated rendering, explicit SIMULATED labeling.
- [ ] Milestone 4: contextual 404 historian, source-backed explanations, uncertainty,
  generated-content labeling, server-side model integration.
- [ ] Milestone 5: browser shell, cinematic/CRT/haunted design, responsive and
  reduced-motion support, "I'm Feeling Unlucky".
- [ ] Release: deployment, deployed archive-access checks, diagnostics, demo checklist.

No authentication, accounts, payments, social features, or large database infrastructure
are required by the current product guide. Preserve the sandbox and provenance rules.

## Evidence and handoff

### 2026-11-03

- Starting commit: `1559c2b`.
- `GET http://localhost:3000`: HTTP 200; homepage contains DEAD INTERNET.
- Real `POST /api/resurrect`, youtube.com + 2007-06-15: HTTP 200, `found`,
  timestamp `20070614120959`, original URL `http://youtube.com/`.
- This proves archive lookup, not visible iframe rendering or exact-nearest accuracy.
- Previous browser attempt stopped because Computer Use could not determine the
  active browser URL confidently. Browser acceptance remains open.

- `npm run smoke`: all six real-network checks passed (homepage, historical lookup,
  random .invalid domain, 2099 date, invalid date, playback HTML HTTP 200).
- `npm test`: 45 tests passed. `npm run lint`: passed.
- HTTP checks can be repeated with `npm run smoke` against the running app;
  set `SMOKE_BASE_URL` to test another deployment.

### Step 2: exact nearest lookup

- Replaced daily collapse and exhaustive pagination with latest-before / earliest-after
  CDX queries at full timestamp precision, in an inclusive +/-6-month window.
- Clamped calendar month ends, added a total 45-second lookup deadline, and keyed
  the candidate cache by the target instant as well as the range and URL.
- Success metadata and no-result messages now show the searched range.
- Regression coverage: dense archives, multiple captures on the previous day,
  sparse archives, leap-year range boundary, partial-query failure, caching.
- `npm test`: 49 passed; lint and production build passed. All six live HTTP smoke
  checks passed again; API confirms the searched range 20061215 to 20071215.
- Updated the Kiro task checkboxes for implemented and verified work. Frontend
  validation, loading/success alignment, playback recovery, and browser acceptance
  remain unchecked.

Next action: retry/timeout regression coverage and browser acceptance.
Browser acceptance remains pending.

### 2026-11-04: shared validation and playback recovery

- Shared URL/calendar validation now runs in the form and on the server. Rejects
  unsupported protocols and embedded credentials; strips fragments from lookups.
- Added retry and static safe mode controls. Each URL, retry, or mode change remounts
  the iframe and resets its 20-second slow-load timer. Sandbox stays allow-scripts
  or empty, without same-origin or top-navigation permissions.
- Viewer status distinguishes loading, slow, load event, and reported error. A load
  event is explicitly not evidence that historical content rendered correctly.
- Added SNAPSHOT FOUND messaging, accessible status announcements, a 60-second
  client request timeout, and project-specific README instructions.
- Browser acceptance attempted, but Computer Use stopped because it could not
  determine the current browser URL confidently enough to enforce policy.
  Visible playback, retry/mode interactions, and browser failure recovery remain open.

- Verification: 59 tests passed, lint passed, production build passed, and all six
  real-network HTTP smoke checks passed against http://localhost:3005. The historical
  YouTube query returned capture 20070614120959 and playback returned HTML HTTP 200.
- Added regression coverage for 429/503 retry recovery, retry exhaustion, and caller
  cancellation during Retry-After. Frontend interaction automation remains pending.

### Capture timeline increment: 2026-11-04

- Added Milestone 2 requirements/design/tasks before implementation. Timeline uses
  monthly HTML/200 samples for one selected year, with 1996/current-year bounds,
  previous/next year navigation, direct year entry, and previous/next sample buttons.
- Full-history CDX queries timed out live; year-scoped queries returned YouTube's
  12 monthly samples for 2007 in under two seconds. Query limit is 13; response
  returns at most 12 distinct months and reports extra upstream rows.
- New POST /api/timeline reuses archive retry/timeouts, caches by URL/year/end date,
  validates capture timestamps/URLs, and recomputes distance from the original date.
- Snapshot switching updates metadata, iframe URL, and provenance together. Original
  requested date and user-selected static mode persist. Archive completeness stays unknown.
- Browser verification succeeded via the in-app browser at localhost:3005: invalid
  February 31 input rejected; real YouTube June 2007 page visibly rendered; selecting
  July 2 changed metadata/iframe/provenance to 20070702141209, preserving June 15 as
  requested date. Static mode had sandbox="" and stayed selected after sample switches.
- Retry returned loading status and reloaded visible archived content. Next sample
  switched to August 2, 2007. Next year returned 12 samples for 2008. Year 1996
  returned an empty message while retaining the August 2007 iframe. The initial
  full-history timeout also showed a retry message while retaining the current page.
- Verification: 77 tests, production build, lint, and all seven live HTTP smoke checks
  passed. Smoke now covers the monthly timeline. No claim that all archived assets
  or embedded videos work; fuller automated frontend/timeout acceptance remains open.

### MUTATE public-page retro conversion: 2026-11-04

- Added Retro view alongside Browse archives. Public HTTP(S) website URLs can be
  converted into text-first 1995 Web, Y2K Portal, or Windows 98 layouts. Theme changes
  reuse the fetched semantic content; source provenance and SIMULATED labels remain visible.
- A bounded server reader validates public DNS results, pins the socket address, and
  revalidates every redirect. Rejects private/mapped/private-network addresses, custom
  ports, credentials, non-HTML, unsupported compression, and oversized bodies.
- Cheerio extracts bounded title/description/headings/text/lists/navigation. Raw source
  markup, CSS, scripts, forms, and media are never rendered. Trusted templates escape
  all text/attributes and use an opaque-origin iframe with CSP disallowing scripts.
- Preview links open original sites in new tabs. Browser checks and JavaScript-only
  sources receive a clear unsupported message. Existing preview survives failures.
- Browser verified Python.org conversion and all three styles. Rejected localhost URL
  showed an error without discarding the Python.org preview. Sandbox has popup-link
  permissions only, with no scripts, same-origin, forms, or top navigation.
- Verification: 128 tests pass, production build and lint pass; live retro smoke passes
  for Example Domain and Python.org plus private-address rejection. All seven archive
  and timeline smoke checks still pass. No external API keys or extraction service.
- Added README instructions and npm run smoke:retro. Converted pages are text-first;
  logins, JS applications, source media, original styling, and forms are not preserved.

### Interactive website remakes: 2026-11-04

- User clarified the goal as recognizable website remakes. Added auto-detected
  YouTube, Facebook, and GitHub layouts plus a manual Video site / Social network /
  Code hosting layout picker for other URLs. Public-content extraction remains an option.
- Platform remakes use clearly labeled illustrative sample content and generate without
  fetching live account data. They do not claim actual videos/posts/repository files.
- Added authored local interactions in an opaque-origin iframe: video search/categories/
  detail/saving, social posts/likes/profiles/tabs, repository files/search/starring/issues.
  CSP blocks network requests; sandbox omits same-origin, top navigation, and forms.
  Remote source code is never executed. User-entered post content uses textContent.
- Browser checked YouTube search (synth), watch details, save/library; Facebook local
  posting/liking and profiles; GitHub file contents/starring/issue expansion; Windows 98
  interactions after style switching; manual social layout for example.com; archive-mode
  switching and preservation of the existing remake. Script-like post text stayed text.
- Verification: 150 tests, production build, and lint pass. Retro HTTP smoke checks cover
  all three platform remakes, real HTML extraction, and private-address rejection; all
  seven live archive/timeline smoke checks still pass. No external posting/account actions.

### Real public YouTube and GitHub data: 2026-11-04

- Added default Public data mode and explicit Sample design mode. Failed public reads
  return errors with the previous preview retained; they never fabricate sample results.
  Facebook public feeds are unsupported and its preset is explicitly labeled a demo.
- YouTube adapter reads bounded public initial-page JSON without evaluating source scripts.
  Supports classic video renderers, current channel lockup cards, and watch-page player
  details. Builds canonical video/thumbnail URLs from validated IDs. Root URL maps to a
  clearly labeled public retro-computing search. Playback uses real YouTube watch links.
- GitHub adapter uses official public repository/contents APIs, with actual root listings,
  README and selected text-file previews. Directories and files navigate through the parent.
  Source content is read-only; stars/saves remain local and are labeled accordingly.
- Service host allowlists apply to every redirect in addition to DNS validation/pinning.
  YouTube reads cap at 5 MB; GitHub at 1 MB; text/listing previews are bounded. Successful
  public pages cache for two minutes with original retrieval times. No account or key used.
- Opaque iframe still has no same-origin access. CSP blocks direct network requests;
  only fixed YouTube thumbnails can load as images. Parent validates exact sender window
  and supported action payloads for public search and repository navigation.
- Browser verified real YouTube titles/authors/thumbnails, a search for javascript tutorial
  loading new public results, and a canonical working watch link. GitHub displayed the actual
  octocat/Hello-World README (Hello World!), and file click changed the source to its real
  blob/master/README URL. HTTP verified a public channel with 18 actual Fireship videos.
- Verification: 168 tests, production build, lint, live retro smoke (public + sample modes),
  and the existing seven archive/timeline HTTP smoke checks pass. Tests cover parsing without
  eval, current channel cards, canonical links, real GitHub content, escaping, redirect
  allowlists, message payload validation, and no-sample fallback on public failures.
- Limits: no generic headless rendering or Facebook authenticated integration. YouTube page
  formats/browser checks can change; errors are explicit. GitHub anonymous rate limits apply.
