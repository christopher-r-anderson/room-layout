# Perf baseline 64daae0

- **Baseline SHA:** `64daae0`
- **Capture date:** `2026-05-31`
- **Host:** `local (tux)`
- **Chromium channel:** `default Playwright chromium` (`Desktop Chrome` device profile)
- **Command:** `pnpm test:browser:perf` (`playwright test --project=perf-chromium`)
- **Scenario config:** `N=5` drag iterations, viewport `1440x960`, `VITE_E2E_RENDER_QUALITY=low`, perf project `trace: off`, `video: off`, `workers: 1`, `fullyParallel: false`

## Artifacts

| Scenario                     | Trace                                                                      | Counters                                                                      |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Drag interaction             | `drag-interaction-64daae0-2026-05-31T14:00:55.836Z.trace.json`             | `drag-interaction-64daae0-2026-05-31T14:00:55.836Z.counters.json`             |
| Selected camera nudge settle | `selected-camera-nudge-settle-64daae0-2026-05-31T14:01:02.075Z.trace.json` | `selected-camera-nudge-settle-64daae0-2026-05-31T14:01:02.075Z.counters.json` |

## Recorded selected-camera-nudge counters

### Nudge-only delta

- `toolbarEmissions: 6`
- `toolbarSinkWrites: 6`
- `toolbarSinkNoOps: 0`

### Settle-only delta

- `toolbarEmissions: 0`
- `toolbarSinkWrites: 0`
- `toolbarSinkNoOps: 0`

## Trace viewers

- `chrome://tracing`
- `https://ui.perfetto.dev`
