# Testing Guide

This guide covers contributor-facing test workflow decisions.

## Test Lanes

- `pnpm test:run`: unit and integration checks (default lane for most code changes)
- `pnpm test:e2e`: browser-accurate editor workflow coverage (Chromium)
- `pnpm test:browser:perf`: browser performance scenarios and artifacts
- `pnpm bench`: utility microbenchmarks

## Choosing a Lane

Use `pnpm test:run` for pure utility/state updates and non-browser changes.

Add `pnpm test:e2e` when changing browser-facing behavior, including:

- startup/loading and retry flows
- scene interaction wiring and history behavior
- keyboard workflows and focus navigation
- dialogs, overlays, semantic focus return, and user-visible editor controls

Use `pnpm test:browser:perf` for frame-time-sensitive changes:

- drag and collision interactions
- camera transitions
- other smoothness-sensitive interaction paths

Use `pnpm bench` for pure helper hot paths where browser rendering is not part
of the measurement goal.

## Browser Test Guidance

Use [editor-workflow-reference.md](editor-workflow-reference.md)
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

## Accessibility Test Coverage

Run `e2e/editor-a11y-audits.spec.ts` when semantics, focus management, or
announcements change.

Automated checks are required but not sufficient. Plan manual assistive-tech
verification for high-impact accessibility changes.

## Artifacts

- HTML report: `playwright-report/`
- Raw traces/screenshots/videos: `test-results/`

See also:

- [../README.md](README.md)
- [editor-workflow-reference.md](editor-workflow-reference.md)
- [overlay-interaction-model.md](overlay-interaction-model.md)
- [.agents/policies/testing.md](.agents/policies/testing.md)
