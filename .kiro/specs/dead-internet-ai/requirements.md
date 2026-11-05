# Requirements — DEAD INTERNET AI

Reviewed 2026-11-05. Feature 1 minimal PoC is authorized. Features 2/3 are design only.
This specification extends RESURRECT and preserves its original archive view.

## Existing capability inventory

- RESURRECT: validated URL/date, exact-nearest HTML/200 capture within six months,
  www fallback, bounded CDX requests, retry/deadline handling and TTL caching.
- Structured API statuses, source metadata, sandboxed archive playback, retry/static
  mode, and monthly timeline with year/capture switching.
- Separate Retro view: trusted templates, public YouTube/GitHub data, explicit sample
  designs, isolated authored interactions and SSRF-safe public-page fetching.
- No model integration, conversation database, deployed cloud service or AI asset
  reconstruction existed at the start of this increment.

## Priority and scope

1. Implement contextual 404 historian, inspectable archive evidence, structured output
   validation, contextual UI, regression tests and a live Gemini smoke test if configured.
2. Specify AI transformation plans for controlled demo pages only; do not implement.
3. Investigate evidence-based reconstruction proposals; do not implement.
4. Evaluate Cloud Run and costs; do not deploy or provision resources.

## Feature 1 — 404 historian

### US1: trustworthy context

WHEN an archived capture is selected THE SYSTEM SHALL bind 404 to the original URL,
raw requested date, actual UTC capture timestamp and server-verified CDX metadata.

WHEN evidence is loaded THE SYSTEM SHALL verify the exact capture server-side and
retrieve bounded readable text from that capture's Wayback playback. Client-supplied
text, metadata or citation URLs SHALL NOT be treated as verified evidence.

WHEN text is unavailable THE SYSTEM SHALL report metadata-only coverage. It SHALL
NOT pretend to have inspected the visible iframe, screenshots or missing assets.

WHEN playback resolves to another capture THE SYSTEM SHALL omit its text and report
the mismatch rather than attribute it to the selected capture.

WHEN the selected URL/date/capture changes THE SYSTEM SHALL cancel pending UI work
and discard previous analysis, preventing cross-capture attribution.

### US2: grounded answers

WHEN 404 answers THE SYSTEM SHALL use only the supplied evidence pack and separate:

- Evidence-backed observations, each with a known evidence ID and exact source quote.
- Explicit inference with evidence and rationale.
- Evidence gaps and matters that cannot be established from the available material.

WHEN questions concern purpose, design, evolution or period culture THE SYSTEM SHALL
answer only what the sources support. One snapshot cannot prove evolution; text-only
evidence cannot establish visual appearance, design intention or resource completeness.

WHEN evidence is inadequate THE SYSTEM SHALL state the limitation without invented
history, statistics, quotations or citations, or unreferenced model knowledge.

WHEN output contains an unknown source ID, nonmatching quote, unapproved URL, invalid
structure or incomplete response THE SYSTEM SHALL reject it instead of displaying it.

THE SYSTEM SHALL label generated content as AI analysis, never ARCHIVED material.
Citation links SHALL be server-built, not accepted from the model.

### US3: server-only Gemini

WHEN inference is requested THE SYSTEM SHALL use the official @google/genai SDK from
server-only modules and a supported, configurable Gemini model.

THE SYSTEM SHALL NOT expose credentials, raw provider errors or secrets in browser
bundles, prompts, responses, committed files or application logs.

THE SYSTEM SHALL use environment configuration, structured JSON, question/evidence/
output limits, token preflight, deadlines and no automatic generation retries.

THE SYSTEM SHALL expose unconfigured, disabled, provider and rate-limit states.
Missing credentials SHALL NOT be simulated as a successful Gemini answer.

THE SYSTEM SHALL disclose that the question and archive excerpts are sent to Gemini.

### US4: cheap and isolated

WHEN 404 is unused THE SYSTEM SHALL make no model calls and leave RESURRECT unchanged.

THE SYSTEM MAY cache bounded evidence and identical answers briefly in process memory,
retaining original retrieval/generation times. No durable conversation store is required.

THE SYSTEM SHALL use a small process-wide attempt budget and concurrency limit, while
documenting that restarts/multiple instances defeat a global spending guarantee.

THE SYSTEM SHALL preserve archive sandbox protections, playback URLs, timeline,
public adapters, validation behavior and existing test/smoke contracts.

## Feature 2 — AI Mutate: design only

WHEN later authorized, Gemini SHALL receive a safe normalized controlled demo page
and one theme: Web 1995, Web 2000, Windows 95, Haunted, Halloween or Post-Apocalypse.

The response SHALL be a versioned JSON plan referencing allowlisted node IDs,
components, layouts, typography and palette tokens with bounded copy changes.

The renderer SHALL reject unknown IDs/tokens/properties and use predefined trusted
components. Arbitrary AI HTML, CSS, JavaScript, event handlers and resource URLs SHALL
NOT execute. The original SHALL remain accessible and the result labeled SIMULATED.

Initial acceptance SHALL use controlled fixtures before arbitrary external websites.

## Feature 3 — AI Resurrection: investigation only

WHEN later authorized, missing-element analysis SHALL start with measured resource
failures and adjacent captures or other explicit historical evidence. Unknown is not missing.

Proposals SHALL retain evidence, confidence, alternatives and provenance. Generated
material is AI RECONSTRUCTION; independently supported historical recovery is RECOVERED.
Nothing inferred/generated SHALL become ARCHIVED evidence or overwrite the original.

This increment SHALL create no reconstructed assets, buckets or replacement views.

## Acceptance

- A real archive capture produces an inspectable evidence pack without changing playback.
- With a configured key, a real server-side Gemini call yields validated structured analysis.
- Unsupported historical questions produce evidence gaps, not confident invention.
- Spoofed captures, injection text, invalid source references and malformed outputs are tested.
- Missing-key/provider failures leave archive browsing usable.
- Build/lint/regressions and archive/retro smoke checks pass; distinguish live from mocked tests.
- Stop and report after Feature 1 PoC. Features 2/3 remain unimplemented.
