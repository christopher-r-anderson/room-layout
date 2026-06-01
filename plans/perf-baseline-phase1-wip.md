# Perf baseline phase1-wip

- **Run label:** `phase1-wip`
- **Comparison baseline:** `64daae0`
- **Capture date:** `2026-05-31`
- **Host:** `local (tux)`
- **Chromium channel:** `default Playwright chromium` (`Desktop Chrome` device profile)
- **Command:** `PERF_BASELINE_SHA=phase1-wip pnpm test:browser:perf` (`playwright test --project=perf-chromium`)
- **Scenario config:** `N=5` drag iterations, viewport `1440x960`, `VITE_E2E_RENDER_QUALITY=low`, perf project `trace: off`, `video: off`, `workers: 1`, `fullyParallel: false`
- **Repo state:** dirty working tree on `pf-architecture-refactor-phase-1` with the perf harness commit already applied underneath local refactor changes

## Artifacts

| Scenario                     | Trace                                                                         | Counters                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Drag interaction             | `drag-interaction-phase1-wip-2026-05-31T14:46:52.299Z.trace.json`             | `drag-interaction-phase1-wip-2026-05-31T14:46:52.299Z.counters.json`             |
| Selected camera nudge settle | `selected-camera-nudge-settle-phase1-wip-2026-05-31T14:46:59.117Z.trace.json` | `selected-camera-nudge-settle-phase1-wip-2026-05-31T14:46:59.117Z.counters.json` |

## Recorded drag-interaction counters

- `toolbarEmissions: 49`
- `toolbarSinkWrites: 49`
- `toolbarSinkNoOps: 0`

## Recorded selected-camera-nudge counters

### Nudge-only delta

- `toolbarEmissions: 6`
- `toolbarSinkWrites: 6`
- `toolbarSinkNoOps: 0`

### Settle-only delta

- `toolbarEmissions: 0`
- `toolbarSinkWrites: 0`
- `toolbarSinkNoOps: 0`

## Comparison to 64daae0

- The selected-camera-nudge counters are unchanged from `64daae0`.
- `Nudge-only delta` matches exactly: `6 / 6 / 0`.
- `Settle-only delta` matches exactly: `0 / 0 / 0`.
- That means the deadband-before-sink-write invariant still holds in this refactor state for the measured camera nudge and settle scenario.
- The baseline note for `64daae0` did not record drag counters, so the current drag counts (`49 / 49 / 0`) are recorded here for future comparisons but are not directly comparable from the checked-in notes alone.
- The current trace artifacts are slightly larger than the selected-camera baseline note implies qualitatively, but there is no checked-in baseline trace size or extracted trace metric to treat as a regression signal yet.

## Trace viewers

- `chrome://tracing`
- `https://ui.perfetto.dev`
