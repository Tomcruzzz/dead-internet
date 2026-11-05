# Research, costs and risks

Reviewed 2026-11-05. USD estimates, not a quote; recheck before deployment.

## Supported integration

Installed official @google/genai 2.32.0 supports server-side GoogleGenAI({apiKey}) and
models.generateContent. Local declarations confirm abortSignal, responseJsonSchema,
retryOptions.attempts and thinkingConfig. Do not use legacy @google/generative-ai.
[SDK](https://github.com/googleapis/js-genai),
[methods](https://googleapis.github.io/js-genai/release_docs/classes/models.Models.html).

The model page lists gemini-3.8-flash as stable with structured output and LOW
thinking; MINIMAL is not supported. No shutdown date is announced in the reviewed
deprecation table. [Capabilities](https://aistudio.google.com/docs/models/gemini-3.8-flash),
[retirement schedule](https://aistudio.google.com/docs/deprecations).
JSON structure alone does not establish factual accuracy; application validation
and evidence discipline remain necessary. [Structured outputs](https://aistudio.google.com/docs/structured-output).

## Gemini usage estimate

Assume 4,000 input and 1,500 output tokens INCLUDING thinking per uncached question.
Paid standard rates are $0.75/$3.75 per million input/output tokens through
2026-12-31; posted 2027-01-01 rates are $1.50/$7.50. Do not assume free-tier quotas
or eligibility. [Pricing](https://aistudio.google.com/docs/pricing#gemini-3.8-flash).

| Questions | Input tokens | Output/thinking tokens | 2026 estimate | Posted 2027 estimate |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4,000 | 1,500 | $0.008625 | $0.01725 |
| 100 | 400,000 | 150,000 | $0.8625 | $1.725 |
| 1,000 | 4,000,000 | 1,500,000 | $8.625 | $17.25 |

Formula: N × (inputTokens/1e6 × inputRate + outputAndThinkingTokens/1e6 × outputRate).
The 8,000-input/2,048-output envelope is about $0.01368/generation at 2026 rates,
excluding token-count/schema accounting differences. Provider usage metadata is
authoritative. No image generation, search grounding, embeddings, vectors or asset
storage calls occur. Cache hits avoid generation; countTokens adds one SDK preflight
call per uncached question, not a second generated answer. No generation retries.

Fifty attempts/day is about $0.43 typical or $0.68 at the stated envelope, excluding
Cloud costs. This is not an enforced monetary cap: counters reset on restart and
provider processing may remain billable after client cancellation.

Planning estimates for the unimplemented features, using the same dated rates:

| Future feature | Assumed input/output including thinking | Per plan | 100 plans |
| --- | ---: | ---: | ---: |
| Controlled-page Mutate plan | 8,000 / 4,000 | $0.021 | $2.10 |
| Resurrection proposal only | 10,000 / 2,000 | $0.015 | $1.50 |

These are generation-only assumptions, not measured usage. Image generation, screenshots,
multi-capture retrieval and asset storage would need a separate estimate before authorization.

## Cloud Run estimate

Assume 1,000 requests lasting 30 seconds at 1 vCPU/0.5 GiB and low concurrency:
30,000 vCPU-seconds and 15,000 GiB-seconds. Tier-1 active request-based rates are
$0.000024/vCPU-second, $0.0000025/GiB-second and $0.40/million requests: approximately
$0.76 BEFORE free-tier deductions. Monthly allowances include 180,000 vCPU-seconds,
360,000 GiB-seconds and 2 million requests, shared by billing account. Region,
other usage and ancillary services affect actual charges. [Cloud Run pricing](https://cloud.google.com/run/pricing).

Inference: a hackathon demo may fit the compute allowance, but a zero bill is not
guaranteed. Keep a separate $5–10 operational planning buffer for builds, artifact
storage, logs, secrets and egress, then measure; the buffer is judgment, not SKU
pricing. Min=0 avoids a permanently warm demo. Max=1 bounds service scaling, not
total API spend. No deployment or paid-service provisioning is part of this task.

## Accuracy and security register

| Risk | Mitigation and remaining limit |
| --- | --- |
| Invented history/intent/citations | Evidence-only instruction, known IDs/exact quotes, separate inference/gaps; semantic entailment still needs review. |
| Current facts projected into 2007 | Selected archive evidence only; no external/current search tools; distinct requested/capture dates. |
| One page called site evolution | Explicit gap; add curated comparative captures before broader claims. |
| Archive prompt injection | Evidence remains data; no tools, source code execution or instruction overrides. |
| Spoofed client evidence | Exact-CDX verification and fixed archive fetching; no client page text/citation URLs. |
| Redirect to live/private/other capture | Pinned DNS, service allowlist, capture/Memento checks; omit mismatched text. |
| XSS/model code | Plain React text and typed schema; server-built links; no AI/source HTML injection. |
| Billing abuse | Bounded tokens, no retries, cache/process limits; protected demo and shared controls before public exposure. |
| Personal/sensitive source data | Minimal excerpts, explicit Google transmission, no question/key logs or durable chat; review provider tier/terms. |
| Unknown assets called missing | Text-only coverage label; iframe load cannot establish completeness. |
| SDK/model retirement | Lock SDK, configurable model, review official deprecations before release. |
| AI overwriting authentic history | Original iframe unchanged; reconstruction proposals remain separate and labeled. |

## Stop gate

Feature 1 PoC only. AI Mutate and AI Resurrection are specified/investigated, not
enabled. No cloud resources, assets, credentials or accounts are created by this work.
