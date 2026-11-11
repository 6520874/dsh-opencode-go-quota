# Changelog

## 0.2.0 — 2026-10-26

First public release.

- Composer status-row pill with remaining percentage for the OpenCode Go rolling 5-hour, weekly and
  monthly quota windows.
- Anchored detail panel with per-window progress bars, reset times and a manual refresh.
- Host-side `opencodeGoQuota.read` Remote method; the API key never leaves the DSH host process.
- 60 s browser polling with background pause, 15 s host cache and request coalescing.
- Graceful degradation: stale snapshots with an amber marker, compact error reasons.
- Responsive truncation that mirrors the official stats pills.
- zh/en localization.
