# Capture timeline: Milestone 2, first increment

- After finding a snapshot, users can load a timeline for the matched original URL.
- Show a monthly sample of successful HTML captures, for the selected year, with previous/next year and direct year entry.
- Clearly label this as one capture per month, rather than all captures or a count of all captures.
- Selecting a capture updates the viewer, metadata, distance from the original requested date,
  and provenance link together without repeating the nearest-date lookup.
- Preserve the original requested date while browsing. Keep the current snapshot usable if
  loading the timeline fails; provide retry and clear empty results.
- Keep bounded archive queries, cancellation, timeout, and caching. Report truncation. Reject years before 1996 or after the current year.
- Preserve iframe sandbox protections. Label material ARCHIVED and asset completeness unknown.
- Browser acceptance must establish visible playback separately from HTTP success.
