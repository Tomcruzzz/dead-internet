# Implementation tasks — dead-internet-ai

## 0. Review and specification
- [x] 0.1 Review RESURRECT, timeline, retro adapters, safety rules and local Next docs.
- [x] 0.2 Research official Gemini SDK/model/structured output, Cloud Run and secrets.
- [x] 0.3 Specify requirements/design, cost estimate and accuracy/security risks.

## 1. 404 historian minimal PoC — implement now
- [x] 1.1 Shared context/evidence/answer types and bounded request validation.
- [x] 1.2 Verify exact CDX capture and retrieve bounded archive text; report gaps.
- [x] 1.3 Server-only official SDK, model/env config, token preflight, structured
  generation, output/quote validation, budgets and cancellation.
- [x] 1.4 Evidence/config/ask endpoints with sanitized errors and no credential leaks.
- [x] 1.5 Contextual 404 panel in RESURRECT; reset on capture/timeline changes.
- [x] 1.6 Tests for spoofing, source mismatch, injection, invalid references/schema,
  cache/limits/config/provider errors and server-only SDK calls.
- [x] 1.7 Lint/build/regressions and archive/retro smoke checks.
- [ ] 1.8 Real evidence + Gemini smoke when local credentials are supplied. Record
  model/usage, never credentials; distinguish live verification from mocked tests.
- [ ] 1.9 Browser context/evidence/labels/error recovery; archive remains usable.
- [x] 1.10 Report results and STOP before Features 2/3.

### Verification record — November 5, 2026

201 tests pass across 12 files; ESLint and production build pass. Existing archive
and retro smoke checks pass, including public YouTube/GitHub adapters. Historian
smoke verifies the real YouTube capture 20070614120959 and six archive text/metadata
excerpts; invalid context and missing-key responses pass. Browser verification
confirms original YouTube playback, requested/actual dates, evidence disclosure,
canonical source links and disabled AI controls without credentials.

1.8 remains pending: GEMINI_API_KEY is empty locally at the last verification, so
no live Gemini generation or billed usage has been verified. SDK tests are mocked.
After configuring it and restarting, run HISTORIAN_SMOKE_REQUIRE_GEMINI=1 with
npm run smoke:historian. 1.9 remains pending for live-answer/error-recovery and
timeline-change browser verification; the evidence-only browser path passed.

## 2. AI Mutate — initial version authorized November 6

Initial opt-in Retro View planner implemented: normalized source blocks, strict
layout/order JSON, trusted directory/newspaper/desktop CSS, three existing themes,
sample/public labels, preserved original text/links and classic fallback. 210 tests,
lint and build pass. Browser controls and classic demo verified. Live Gemini remake
was initially blocked by Gemini errors. Groq backup is now live-verified: a controlled
sample returned a validated plan from openai/gpt-oss-20b in about 1.2 seconds.
An additional browser request exercised the labeled classic fallback successfully.
224 tests, lint and production build pass after adding provider-chain coverage.
The richer six-theme/component registry below remains future work.
- [ ] 2.1 Controlled demo PageDocument fixtures and theme/component/token registry.
- [ ] 2.2 Versioned JSON plan schema with strict semantic validation.
- [ ] 2.3 Separate Gemini planner using existing server/budget boundary.
- [ ] 2.4 Trusted renderer, original/preview comparison and SIMULATED label.
- [ ] 2.5 Adversarial/accessibility/reduced-motion checks; review external-page expansion.

## 3. AI Resurrection — investigation only, needs later authorization
- [ ] 3.1 Objective resource-failure measurement and unknown-state handling.
- [ ] 3.2 Adjacent-capture/primary-source evidence and provenance requirements.
- [ ] 3.3 Proposal-only analysis with evidence/confidence/alternatives.
- [ ] 3.4 Review approved generated assets/storage/retention; preserve originals.

## 4. Cloud deployment — evaluate now, execute later
- [x] 4.1 One Cloud Run service, min=0/max=1, Secret Manager, no Storage yet.
- [ ] 4.2 Shared abuse/spend controls or retain an IAM-protected demo.
- [ ] 4.3 Test source/standalone deployment with runtime secrets.
- [ ] 4.4 Deploy only on explicit request; measure cold start, egress and archive access.
