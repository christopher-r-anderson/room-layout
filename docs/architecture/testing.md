# Testing Guide

This guide covers contributor-facing test workflow decisions.

## Test Lanes

- `pnpm test:run`: unit and integration checks (default lane for most code changes)
- `pnpm test:e2e`: browser-accurate editor workflow coverage (Chromium)
- `pnpm bench`: utility microbenchmarks

## Choosing a Lane

Use `pnpm test:run` for pure utility/state updates and non-browser changes.

Add `pnpm test:e2e` when changing browser-facing behavior, including:

- startup/loading and retry flows
- scene interaction wiring and history behavior
- keyboard workflows and focus navigation
- dialogs, overlays, semantic focus return, and user-visible editor controls

Use `pnpm bench` for pure helper hot paths where browser rendering is not part
of the measurement goal.

## Performance

Performance is checked by lane, not by measuring frame time in CI — headless
Chromium renders WebGL via SwiftShader (software), so its frame times are not
representative of a real GPU.

- **Hot-path algorithms** → `pnpm bench` microbenchmarks (footprint/drag/geometry).
- **Work-churn regressions** (a lost memo, unstable dependency, or render loop that
  re-runs while idle) → deterministic behavioral gates in the e2e lane. Example:
  `e2e/selected-toolbar-idle.spec.ts` asserts the floating-toolbar store does not
  write while the camera is at rest — a count that is structurally zero regardless
  of frame rate, so it is reliable in CI.
- **Real frame-time / interaction latency** → not a CI gate. Profile interactively
  on the running app (real GPU) when investigating, and rely on production RUM
  (web-vitals INP, custom marks) for fleet-wide regressions. _(RUM is a future
  workstream.)_

## Browser Test Guidance

Use [editor-workflow.md](editor-workflow.md)
as the manual workflow map when planning browser tests or reviewing coverage.

For scene-only Playwright tests where overlay UI is incidental, use the shared
overlay-hidden harness helpers in `e2e/support/editor-harness.ts` to avoid
mouse -> scene interference.

Do not hide overlays when the contract under test is UI behavior:

- outliner, selected-item controls, dialogs, toolbars
- focus order and accessibility semantics
- pointer hit-target and layout behavior

For dialog architecture changes, include coverage for:

- one-active-surface mutual exclusion
- blocking vs non-blocking behavior contracts
- responsive focus-return continuity across header layout transitions

If pointer behavior is not the feature being tested, prefer keyboard
focus/activation paths to keep tests less brittle.

## Determinism

Browser tests run in parallel against one shared server, so timing-coupled tests
flake intermittently — usually only in full runs, not when run alone. Two rules
keep them stable:

- e2e runs against a production `vite preview` build, never the dev server. The
  dev server's dependency optimizer and HMR can trigger full-page reloads
  mid-test, which restart the app and reset its state. Test-only instrumentation
  (the scene-state bridge, perf counters) is gated on the `VITE_E2E` build flag
  rather than `import.meta.env.DEV` so it still works in that production build.
- Drive interactions with bounded, deterministic inputs. Do not hold an input
  "until a polled condition is observed" (e.g. holding a key until the camera
  has moved): release/poll latency makes the real magnitude unbounded under
  load. Use a fixed, small input and assert the durable invariant, not an exact
  value that only a precisely-bounded input would guarantee — push exact-value
  checks down to deterministic unit tests.

## Accessibility Test Coverage

Run `e2e/editor-a11y-audits.spec.ts` when semantics, focus management, or
announcements change.

Automated checks are required but not sufficient. Plan manual assistive-tech
verification for high-impact accessibility changes.

## Artifacts

- HTML report: `playwright-report/`
- Raw traces/screenshots/videos: `test-results/`

See also:

- [../../README.md](../../README.md)
- [editor-workflow.md](editor-workflow.md)
- [dialogs-and-overlays.md](dialogs-and-overlays.md)
- [.agents/policies/testing.md](../../.agents/policies/testing.md)
