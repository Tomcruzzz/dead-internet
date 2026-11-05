# Dead Internet

Find a historical website snapshot using the Internet Archive Wayback Machine.

## 404 AI Historian (Feature 1 PoC)

The new Kiro spec is in [.kiro/specs/dead-internet-ai](.kiro/specs/dead-internet-ai/requirements.md).
AI Mutate and AI Resurrection are design-only; this increment implements only 404.

1. Copy `.env.example` to ignored `.env.local` and set `GEMINI_API_KEY` there.
   Never paste a key into the app or use a `NEXT_PUBLIC_` key variable.
2. Default model: `gemini-3.8-flash`; optional `GEMINI_MODEL` is server-side configuration.
3. Restart the app after changing environment values. RESURRECT works without a key.
4. Find a capture in Browse archives. The contextual **404 AI Historian** panel appears
   below the original viewer. Review evidence without a model call, or ask a question.

404 verifies the exact capture with CDX, retrieves bounded archive text, and uses the
official server-only `@google/genai` SDK. Answers separate evidence-backed observations,
inference and gaps; each claim needs a known source and matching quote. This validates
source linkage, not semantic truth: review the excerpts. Unsupported history should be
reported as missing evidence. A single text capture does not establish visual design,
site evolution, internet culture, or missing-resource completeness.

Questions and bounded excerpts go to Google Gemini. No durable chat history or prompt/key
logs are kept. A short-lived process cache avoids repeat calls; original retrieval and
generation times remain visible. Defaults: 50 attempts/day/process, 6/minute, two concurrent
model requests, 8000 counted input tokens and 2048 output tokens. Counters reset on restart;
they are not a hard billing cap. `AI_HISTORIAN_ENABLED=false` disables generation.

Run `npm run smoke:historian` against a running app (`SMOKE_BASE_URL` overrides port 3000).
It checks real archive evidence and calls Gemini only if the server is configured. It
explicitly reports skipped live generation; `HISTORIAN_SMOKE_REQUIRE_GEMINI=1` makes that
a failing check. Keep paid calls small. See the spec's research/costs and Cloud Run design
before deploying. No cloud resources or reconstruction assets are created by this PoC.

## Run locally

Install dependencies with `npm ci`, then run `npm run dev` and open
http://localhost:3000. For production, run `npm run build` then `npm start`.
Use a Node.js version supported by the installed Next.js package.

Enter a website such as `youtube.com` and a date such as `2007-06-15`.
Dates accept YYYY, YYYY-MM, or YYYY-MM-DD; omitted parts default to January/day 1.
The app searches within six calendar months of the target, tries with and without
www, and displays the nearest successful HTML capture and its source link.

## Playback and recovery

Archived pages load in an isolated Wayback iframe. Use **Retry snapshot** to reload,
**Use static safe mode** to disable archived scripts, or **Open on Wayback** to view
the source directly. Static mode may omit content that requires JavaScript.
Neither mode allows archived pages to navigate the top-level app or access its origin.

A viewer load event does not prove that the archived page rendered successfully.
Cross-origin restrictions prevent checking its contents; missing resources, blank
pages, and archive errors can still occur. Recovery controls remain available.

Archive lookup requests have a 45-second server deadline and the client stops
waiting after 60 seconds. Archive access requires a working Internet connection.
No archive API key or environment variables are required.

## Verification

- `npm test`: unit and mocked API regression tests.
- `npm run lint`: lint checks.
- `npm run build`: production compilation and type checking.
- `npm run smoke`: real-network HTTP checks against a running app on port 3000.
  Set `SMOKE_BASE_URL` to test another address.

HTTP smoke checks cover a real historical lookup, missing snapshots, future dates,
invalid dates, and playback HTTP content. They do not prove visible iframe rendering.
Browser acceptance remains tracked in `.kiro/completion-plan.md`.

## Capture timeline

After finding a snapshot, choose **Explore capture timeline** to browse monthly
samples for its year. Use **Previous year**, **Next year**, or enter a year directly
(from 1996 through the current year). Click a capture date or use previous/next
sample to switch the viewer and metadata together. Your original requested date
stays visible for comparison. The timeline shows one successful HTML capture per
month, not every capture or a guarantee that all resources survive. Empty years
and archive errors preserve the current snapshot. Static safe mode stays selected
when moving between captures.

## Retro view (MUTATE)

Select **Retro view**, choose **1995 Web**, **Y2K Portal**, or **Windows 98**, and enter
a website URL. **Public data** is the default content source. The layout is always
labeled **SIMULATED**; source content is separately labeled public or sample.

- **YouTube:** public search, video, and supported channel pages provide real titles,
  authors, durations where supplied, thumbnails, and canonical video links. Entering
  youtube.com starts a clearly labeled public search for "retro computing". Search
  from inside the preview to load new YouTube results. Playback opens YouTube.
- **GitHub:** enter a public repository URL to load its metadata, directory entries,
  README, and selected text files. Click files/folders to browse actual public contents.
  Large/binary files are not fully previewed; source links remain available.
- **Other public pages:** Auto/Website mode still restyles readable server-returned
  HTML. This is not a generic headless-browser renderer; JavaScript-only apps may fail.
- **Sample design:** explicitly choose this source for illustrative interactive layouts
  or Facebook demos. No live Facebook account/feed integration is implemented.

Styles switch without refetching content. Local saves, likes, stars, and demo posts
never change an external account and reset when the preview reloads. No login, tokens,
or API keys are used. Errors do not silently replace public content with samples.

Public YouTube data is parsed from its initial page JSON without executing source
JavaScript; page-format changes, browser checks, or service restrictions can prevent
retrieval. GitHub uses its read-only public REST API and anonymous rate limits apply.
Successful public pages are cached for two minutes with their original retrieval time.

The server validates/pins public DNS addresses and rechecks service host allowlists
on redirects. Generic pages are capped at 1.5 MB, YouTube at 5 MB, and GitHub API
responses at 1 MB. Text previews and listings are bounded. Preview scripts cannot
make network requests; search/navigation sends validated messages to the parent.
Only YouTube's fixed thumbnail host can supply images to the public video preview.
Source HTML, CSS, scripts, forms, and media players are never injected into the app.

Run `npm run smoke:retro` against the running app to verify real YouTube results,
GitHub README/file navigation, generic page extraction, explicit samples, unsupported
Facebook public mode, and private-address rejection. Set `SMOKE_BASE_URL` as needed.
