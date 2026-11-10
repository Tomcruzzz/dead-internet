# Design — DEAD INTERNET AI

## Recommended architecture

Browser archive view → contextual 404 panel → Next.js POST /api/historian → server
evidence loader → official @google/genai → validated JSON → safe React output.

GET /api/historian reports configuration without key contents. POST
/api/historian/evidence returns an inspectable evidence pack with no model call.
Keep /api/resurrect and /api/timeline contracts unchanged. No separate AI service,
database, vector store, search agent, generic chat endpoint or browser SDK is needed.

Default to gemini-3.8-flash, documented stable with structured output and LOW thinking.
GEMINI_MODEL may override it with another separately verified supported model.
[Model](https://aistudio.google.com/docs/models/gemini-3.8-flash),
[deprecation schedule](https://aistudio.google.com/docs/deprecations).

Use server-only @google/genai 2.32.x, locked by package-lock, through countTokens and
generateContent. Enable no tools, external search, URL context, code execution or
model function calling. [Official SDK](https://github.com/googleapis/js-genai),
[SDK methods](https://googleapis.github.io/js-genai/release_docs/classes/models.Models.html).

## Evidence pipeline

1. Validate bounded JSON, question ≤1000 characters, normalized HTTP(S) original URL,
   requested date and valid 14-digit capture timestamp.
2. Query CDX for that URL/instant, HTML/200, limit 1. Require the same timestamp.
   Client context selects evidence; it does not establish its authenticity.
3. Construct canonical/id_ playback URLs from the verified row. Reuse pinned public
   DNS fetching with a web.archive.org allowlist, 1 MB cap and deadline. Reject text
   attribution if the final URL capture or supplied Memento date differs.
4. Parse without running scripts; remove executable/form/toolbar noise. Emit a title
   and readable chunks totaling at most 10,000 characters, plus metadata evidence.
   Archive text is untrusted data and never instructions. Render no source HTML.
5. Cache verified capture material by URL+timestamp. Apply requested-date context
   after lookup so differing requests do not reuse incorrect dates or distances.
6. Assign IDs E1..En and server-built capture URLs, labels, excerpts, retrieval time,
   CDX digest/status and explicit text/metadata-only coverage limitations.

The application cannot read a cross-origin iframe DOM; do not weaken the sandbox.
This PoC sees retrievable text and metadata, not screenshots, source CSS, missing
images, complete site history or resource integrity. No broad historical context
can be justified by a single page alone.

## Generation and validation

The system instruction defines 404 as an evidence-only archive historian. Source text
and questions cannot override instructions. Never invent history, intent, citations
or assets; distinguish requested/capture dates and explain absent evidence.

JSON response shape, without a free-form uncited summary:

- observations[]: claim, evidenceId, exact quote;
- inferences[]: claim, evidenceId, exact quote, rationale;
- gaps[]: bounded evidence limitations.

Use application/json plus responseJsonSchema, LOW thinking, maximum 2048 output
tokens and no retries. Token preflight includes the prompt, system instruction and
schema representation; reject above 8000 tokens. Propagate cancellation/deadlines.
[Structured outputs](https://aistudio.google.com/docs/structured-output).

Validate again server-side: allowed keys/types/counts/lengths, known IDs, normalized
literal quote membership, and no model-supplied URLs. Reject invalid/incomplete output.
Resolve citations only from the server evidence map. A valid quotation is not proof
of semantic entailment: residual model error requires source review. Expose excerpts
and AI-analysis labels; no automatic second-model verifier or agent loop in the PoC.

Budget defaults: 50 attempts/day/process, 6/minute/process, two concurrent requests;
bounded five-minute answer cache keyed by model/prompt version/question/evidence hashes.
One token-count SDK call and one generation call per uncached answer. Disable SDK
retries. Aborting a client wait does not guarantee termination of provider billing.

## Configuration and privacy

GEMINI_API_KEY belongs in ignored .env.local; GEMINI_MODEL=gemini-3.8-flash and
AI_HISTORIAN_DAILY_LIMIT=50 are server configuration. No NEXT_PUBLIC_ secret or Next
config env injection. Use server-only import guards and lazy SDK initialization.

Do not log questions, excerpts, keys or raw provider errors. Keep bounded process
memory only. Historical public pages may contain personal information: send minimal
excerpts, disclose Google transmission and avoid user secrets. Free/paid data terms
differ; review before processing sensitive material. [Terms](https://aistudio.google.com/docs/terms).

## Contextual UI

Attach 404 to a successful RESURRECT result, keyed by URL/requested date/capture.
Offer the four historical question examples, editable question, evidence review,
loading/error/cancel states, observations/inferences/gaps, source quotations and
model/retrieval/generation metadata. Make no automatic AI requests. Capture changes
unmount/cancel and clear analysis. Keep the original archive viewer independent.

## Feature 2 — initial implementation authorized November 6

Retro View now offers an opt-in Gemini planner via POST /api/retro/ai. It reuses
the existing bounded public fetch/adapters or controlled sample pages, never a
logged-in browser session. Normalized source blocks receive integer IDs; the
model chooses a trusted directory/newspaper/desktop layout and up to eight block
IDs to feature. Strict validation rejects arbitrary fields, code, unknown IDs,
duplicate IDs and model URLs. The application preserves all normalized blocks and
source links, then renders escaped text through authored CSS with scripts disabled.
Sample content stays labeled. AI does not recreate full application functionality,
inspect computed CSS/screenshots or execute JavaScript-only sites without adapters.
The initial themes are existing 1995 Web, Y2K Portal and Windows 98. Further themes
and richer component plans below remain future work. Feature 3 is still unimplemented.

If planning fails (including missing/disabled credentials, invalid output, quota or
provider errors), return the already-retrieved source with an explicit classic
fallback notice. Never label this as an AI-generated plan. Source fetch failures
remain errors: a fallback cannot manufacture source content. No secondary provider
is needed for classic fallback. Groq is now an explicitly disclosed second provider:
Gemini gets one bounded 22-second attempt, then Groq gets one 15-second attempt.
Both pass the identical plan validator; all-provider failure uses classic rendering.
GROQ_API_KEY remains server-only. GROQ_MODEL defaults to openai/gpt-oss-20b, with
openai/gpt-oss-120b also allowed; both support strict JSON schema. Groq REST calls
use a fixed endpoint, no retries/redirects, 2,048 completion tokens, and a 64 KiB
response cap. The shared process budget covers the whole chain and cannot be
bypassed via fallback. Cancelling skips the next provider. This applies to Retro
View only; the evidence-only 404 historian retains its existing Gemini boundary.

Live verification November 6: controlled sample returned HTTP 200 with provider
groq, model openai/gpt-oss-20b and a validated newspaper plan in 1.2 seconds.
224 tests, ESLint and production build pass. Free tier limits remain provider/account
dependent; free service has no guaranteed availability. Official references:
[Groq strict output](https://console.groq.com/docs/structured-outputs),
[rate limits](https://console.groq.com/docs/rate-limits).

Input budget: 8,000 tokens, 40 abbreviated source blocks, 1,024 output tokens,
LOW thinking, no retries and 45-second provider timeout. Uses the existing
server-only key/configuration and shared prototype budget (50/day for this path).
One explicit user action makes one generation; changing theme restyles the existing
plan until the user rebuilds. Previous previews remain visible if planning fails.

### Future richer plans

Controlled PageDocument fixture → Gemini JSON plan → strict validator → trusted
theme renderer → SIMULATED side-by-side preview. Plan schema: version, theme enum,
blocks[{nodeId, componentVariant, layoutToken, typographyToken, paletteToken,
optional replacementText}], warnings. Reject unknown IDs, HTML/code, arbitrary CSS
and URLs. Themes map to authored Web 1995/Web 2000/Windows 95/Haunted/Halloween/
Post-Apocalypse components. The model chooses a plan; the renderer owns executable code.
Test deterministic fixtures, accessibility, reduced motion and adversarial plans
before reviewing arbitrary-site expansion.

## Feature 3 investigation — not implemented

Measure resource failures in an isolated environment; retain unknown states. Compare
adjacent captures and licensed primary sources with explicit timestamp differences.
Gemini may propose hypotheses/evidence, not silently repair. Validate plans, require
review, preserve the original, and label AI RECONSTRUCTION/RECOVERED per provenance.
Asset generation, persistence and replay remain a later decision. Generated material
must not become a historical source for another 404 answer.

## Cloud Run evaluation — no deployment

One existing Next.js Node service is sufficient. Start with request-based billing,
1 vCPU, 512 MiB (measure; increase if required), min=0/max=1 instances, concurrency 8
and a 120-second service timeout. Bind PORT on 0.0.0.0. Prefer source build initially;
an optional later standalone image must include public/.next/static and exclude .env.
Local Next docs were reviewed; no deployment build config is changed by this PoC.
[Cloud Run Next.js quickstart](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service).

Inject the API key from a versioned Secret Manager secret. Use a dedicated service
account with access to that secret only, never committed service-account JSON.
[Secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets).
The Developer API is simplest now. IAM/ADC-based enterprise/Vertex use is optional
later, with separate model/region/pricing verification. No extra runtime Google Cloud
SDK is needed for this key-based PoC; gcloud is deployment tooling.

Keep the first demo IAM-protected. Before unauthenticated public access, add shared
abuse/spend enforcement or an access gateway. Process counters reset and are not
global caps. Provider quotas and billing alerts are separate; alerts do not stop
spend. Test cold starts and archive access from the deployed region. Builds, registry,
secrets, logs and egress can add cost. Cloud Storage is unnecessary until Feature 3
actually creates approved assets; consider private lifecycle-managed buckets then.
No bucket, database or VPC connector is provisioned now.
