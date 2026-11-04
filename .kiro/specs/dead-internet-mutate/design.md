# Design

RetroApp: URL form, three style choices, explicit SIMULATED provenance, source link,
loading/error/retry, and a generated iframe. WebsiteApp switches between archive and
retro modes. Preserve mode components while switching so results survive.

POST /api/retro accepts URL and returns a bounded semantic PageContent object.
Server-only fetch resolves the hostname, rejects every non-public DNS result, pins
one validated address in the HTTP client's lookup callback, and validates each
manual redirect. HTTP/HTTPS only, ports 80/443 only, no credentials/cookies, four
redirects, 20-second total deadline, 1.5 MB body limit, no decompression (identity).
Reject unsupported encodings, non-HTML, status errors, and pages without usable text.

Cheerio parses HTML without executing code. Remove executable and hidden/navigation
noise; extract bounded text blocks and safe source links. Never pass raw markup,
source CSS, handlers, scripts, or forms to the browser.

A browser-safe renderer escapes all source text and URL attributes, then builds
an original two-column old-web page from trusted templates. Three complete design
systems vary layout, type, backgrounds, borders, navigation and chrome. Iframe srcDoc
has CSP default-src none; script-src none; style-src unsafe-inline; base-uri none;
form-action none. Sandbox permits only popup links to source pages in separate tabs;
no scripts, same-origin, top navigation, forms, or source media. React renders only
the controls and provenance outside the iframe. Tests cover network boundaries,
redirects/body limits, extraction, escaping, and API failures. Verify real conversion
and theme switching in the in-app browser.

## Interactive remake increment

RetroPage gains remake metadata. API validates URL then detects exact platform
hostnames (including their subdomains); explicit layout overrides work for other URLs.
Platform remakes are generated immediately with labeled illustrative content and do
not fetch live/login-only data. The existing website layout still extracts public HTML.

Platform templates are separately authored, with video-grid, social-feed, and code
browser structures, theme-specific CSS, and trusted local DOM event handlers. Never
interpolate source content into executable JavaScript. The script is a fixed source
string authorized by CSP nonce, with no eval or network access. Platform preview
sandbox allows scripts and popup links but omits same-origin/forms/top navigation.
Old text-first previews remain script-free. Content uses escaped text, source links
use validated HTTP(S) URLs, and locally entered demo text uses textContent only.

## Public data adapters

YouTube uses bounded HTML reads from www.youtube.com and JSON.parse of balanced
initial-data objects. Never eval scripts. Extract validated video IDs from videoRenderer
and player details. Limit the grid to 18 videos, build watch/thumbnail URLs from IDs,
and fail clearly on consent/blocks/markup changes. Plain homepage maps to a labeled
retro-computing public search. Use server-returned data rather than a generic headless
browser: no remote JavaScript is required to get these public results.

GitHub uses read-only api.github.com repository/contents/readme endpoints without
credentials. Limit text previews and file listings, expose actual file metadata, and
provide parent-handled navigation for directories/files. Cache successful public pages
briefly with their original retrieval timestamps. Do not cache errors or replace them
with sample fixtures. Host allowlists apply to every redirect on top of DNS pinning.

Opaque iframe sends fixed action messages to parent for public search/repository navigation.
Parent checks event.source against the iframe contentWindow and validates action payloads.
All actual requests use the existing server boundary. CSP connect-src none remains; only
https://i.ytimg.com may serve images. Sample mode remains selectable and clearly labeled.
