# MUTATE: public-page retro conversion

- Provide a Retro view mode alongside archive browsing, accepting any public HTTP(S)
  website URL and a style: 1995 Web, Y2K Portal, or Windows 98.
- Convert readable server-returned HTML into a new text-first page structure with
  the source title, description, headings, paragraphs, lists, and navigation links.
- Display SIMULATED, source URL, and limitations. Never imply historical authenticity.
- Keep transformations deterministic, without an LLM key or third-party extraction service.
- Never inject arbitrary source markup/styles/scripts into the app origin. Render only
  escaped semantic data in a script-free opaque-origin sandboxed iframe.
- Links may open source pages in separate tabs; logins, forms, scripts, media, and live
  application behavior are omitted. Clearly explain blocked/JS-only/empty sources.
- Prevent private-network server fetches, including DNS resolution and redirects;
  enforce HTTP(S), standard ports, content type, response-size and total-time limits.
- Theme changes reuse extracted content; new URL requests cancel stale work.
- Existing archive browsing and capture timeline remain available.

## Interactive remake increment

User clarification: remake recognizable website layouts rather than extract text.
- Detect YouTube, Facebook, and GitHub URLs and create distinct interactive remakes.
- Offer video, social, and code layouts for any entered public URL via a layout selector.
- Always label sample content; never imply connection to real accounts/live content.
- Video remakes support local search/category filtering and video-detail views.
- Social remakes support local demo posts, likes, and feed/people navigation.
- Code remakes support file browsing, local starring, and code/issues/about views.
- Trusted interaction scripts may run only inside an opaque-origin iframe; never
  execute source-site scripts or allow same-origin access. CSP blocks network calls.
- Plain website conversion remains available and script-free. Local preview changes
  reset on style switch/reload; no account, posting, or API side effects.

## Real public content increment

- Public data is the default for YouTube and GitHub. Sample designs require explicit selection.
- YouTube supports public search URLs, video links, and channel URLs where public data
  is returned. Display actual titles/authors/durations when supplied, real thumbnails,
  and canonical working watch links. Empty homepage uses an explicitly labeled public
  search, not a pretend personalized feed. Missing/blocked data is an error, never samples.
- Public search works from inside the retro view. No login or personalization is copied.
- GitHub repository URLs display public metadata, directory entries and selected text files.
  Directory/file navigation reloads public data, with retrieval timestamps and size bounds.
- Distinguish SIMULATED layout from public source content. Do not present local saves/stars
  as account changes. Source links are canonical and all source content stays escaped.
- Reuse validated DNS pinning, redirect/host allowlists, request deadlines, and body caps.
- Renderers may load thumbnails only from YouTube's fixed thumbnail host. Preview scripts
  cannot make network requests; validated messages to the parent trigger public adapters.
- Facebook authenticated data and generic arbitrary-site headless rendering remain unsupported.
