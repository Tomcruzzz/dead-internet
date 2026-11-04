# Design

POST /api/timeline takes the matched URL, original requested date, and a selected
year. Query CDX from January 1 to December 31 (or today for the current year), using
HTML/200 filters, collapse=timestamp:6, and limit=13. Return at most 12 monthly
samples, sorted chronologically, with a truncated flag. Validate CDX capture dates
and original URLs before exposing playback. Cache raw rows for 15 minutes by URL,
year, and end date; derive distance from the original request for every response.
Use the existing CDX retry/timeout machinery and a 45-second total deadline.
Do not collapse exact-nearest lookup candidates.

A full-history query timed out during live verification. Year-scoped queries
returned 12 samples in under two seconds for YouTube in 2007. Expose previous/next
year and direct year entry; do not claim to know which other years have captures.

CaptureTimeline loads on demand, owns loading/error/year selection, and aborts on
unmount. Its parent retains the original request date. Snapshot selection replaces
snapshot, playback, and searched range atomically. The viewer remounts its iframe
on each URL while preserving the user's static/interactive mode choice. Year and
sample controls are keyboard accessible. Full provenance scoring and reconstructed
material remain future increments; asset completeness is explicitly unknown.
