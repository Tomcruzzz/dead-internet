# Dead Internet completion plan

Working agreement: complete one step at a time, verify the result, update this file
and the relevant milestone tasks, then commit and push to `main` after each step.
Do not mark live browser acceptance complete from mocked tests or HTTP checks.

## Milestone 1: finish RESURRECT

- [ ] 1. Verify the real archive flow and save acceptance evidence (task 6.4).
  - [x] Homepage serves successfully and the real YouTube lookup returns a capture.
  - [x] Repeatable HTTP checks for found, never archived, future, invalid input, playback.
  - [ ] Browser: visible archived content, metadata, provenance link, failure recovery.
- [x] 2. Correct archive lookup accuracy and report the searched range (tasks 2.1, 2.3).
  Preserve individual capture timestamps; handle sparse archives and month boundaries;
  retain bounded requests, caching, and clear upstream failure states.
- [ ] 3. Share URL/date validation between client and server (task 4.1).
- [ ] 4. Finish playback recovery: retry, static safe mode, honest load status (4.4, 5.2).
- [ ] 5. Cover retries/timeouts, input validation, and frontend state transitions (6.1-6.4).
- [ ] 6. Finish success/loading messaging, README, and reconcile specs/tasks (4.2, 7.2).
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

Next action: step 3 shared validation.
Browser acceptance remains pending.
