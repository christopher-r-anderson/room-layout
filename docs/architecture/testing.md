# Testing Guide

This guide covers contributor-facing test workflow decisions.

## Test Lanes

- `pnpm test:run`: unit and integration checks (default lane for most code changes)
- `pnpm test:e2e`: browser-accurate editor workflow coverage (Chromium)

## Choosing a Lane

Use `pnpm test:run` for pure utility/state updates and non-browser changes.

Add `pnpm test:e2e` when changing browser-facing behavior, including:

- startup/loading and retry flows
- scene interaction wiring and history behavior
- keyboard workflows and focus navigation
- dialogs, overlays, semantic focus return, and user-visible editor controls

## Performance

Performance is checked by lane, not by measuring frame time in CI - headless
Chromium renders WebGL via SwiftShader (software), so its frame times are not
representative of a real GPU.

- **Work-churn regressions** (a lost memo, unstable dependency, or render loop that
  re-runs while idle) -> deterministic behavioral gates in the e2e lane. Example:
  `e2e/selected-toolbar-idle.spec.ts` asserts that with a selection on screen and
  the camera at rest, no work happens - zero toolbar-store writes and zero App/Scene
  re-renders. These counts are structurally zero regardless of frame rate, so the
  gate is reliable in CI and catches a render loop anywhere in the tree.
- **Real frame-time / interaction latency** -> not a CI gate. Profile
  interactively on the running app (real GPU) when investigating.
- **Bundle size** -> per-chunk gzip budgets enforced by `pnpm bundle-budget`
  (a preflight step after the build; not run by the CI workflows) via
  `scripts/check-bundle-budget.mjs`: a tight budget on the first-paint shell
  chunk, a looser one on the lazy engine chunk (three/r3f/drei), and entries
  for the smaller split chunks; an unbudgeted chunk fails the check. These are
  regression gates set at current size plus headroom, not targets - lower them
  when the bundle shrinks.

## Coverage

A low coverage number is a place to look, never by itself a reason to add a
test. Some code is intentionally not unit-tested: thin hook glue covered by
e2e, presentational/config modules, and a short list of accepted gaps. These
are recorded - with their verified e2e
cross-references - in
[../testing/intentional-unit-exclusions.md](../testing/intentional-unit-exclusions.md)
so a `0%` reading is not mistaken for a hole. Update it when a module joins or
leaves that set.

## Browser Test Guidance

Use the Manual Verification flows below as the workflow map when planning
browser tests or reviewing coverage.

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
flake intermittently - usually only in full runs, not when run alone. Two rules
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
  value that only a precisely-bounded input would guarantee - push exact-value
  checks down to deterministic unit tests.
- In unit tests, prefer tolerant float assertions (`toBeCloseTo`) for
  geometry-derived values.

## Accessibility Test Coverage

Run the a11y lanes when semantics, focus management, or announcements change:

- `e2e/editor-a11y-audits.spec.ts` - whole-page axe scans (WCAG 2.2 A/AA tags,
  zero rule disables; helper in `e2e/support/axe.ts`) over the happy-path
  editor states.
- `e2e/feedback-a11y-audits.spec.ts` - the same scans over feedback states:
  toasts visible (including over an open drawer), startup loading and error
  overlays, field errors, the F6-focused notifications region.
- `e2e/feedback-routing.spec.ts` - pins the event-class -> surface routing
  (unit twin: `core/stores/feedback-store.test.ts`; guidance:
  [feedback.md](feedback.md)).
- `e2e/feedback-toasts.spec.ts` - toast lifecycle: persistence, auto-dismiss,
  stacking/limit, F6 focus, shell quiescence.
- Toast locators live in `e2e/support/toasts.ts`; announcer channel readers in
  `e2e/support/editor-harness.ts`.

`eslint-plugin-jsx-a11y` is deliberately not part of the lint gate: a spike of
its recommended config produced only false positives against deliberate,
commented patterns (the explicit `role="list"` Safari fix, escape-to-close key
handling on the room panel, the focusable room-view region, modal autofocus).
The axe e2e lane is the automated a11y gate.

Automated checks are required but not sufficient. For feedback-surface changes
run the manual assistive-technology script in
[feedback.md](feedback.md#manual-assistive-technology-pass); plan manual AT
verification for any other high-impact accessibility change.

## Manual Verification

For manual passes (validating behavior changes, reproducing reports), walk the
core flows:

- Add an item, select it in the scene and from `Furniture in room`, and
  confirm the selection stays aligned across canvas, panel, and toolbar.
- Move (drag and arrow keys), rotate, and delete; movement stays in bounds and
  avoids collisions.
- Room panel: finishes, lighting mood, and the `Size` tab (typed dimensions
  commit on Enter/blur and cancel on Escape; shrinking never moves furniture -
  out-of-bounds items get a warning outline and a one-step undoable
  `Move items inside`); the editor stays interactive while the panel is open.
- Keyboard-first: camera motion and presets, focus-selected (`F`), the
  pane-focus shortcuts, and undo/redo/start-over; room-view shortcuts stay
  scoped to room-view focus.
- Dialogs: surfaces open and close predictably, `Escape` closes, and focus
  returns to the opening control (native restore for blocking dialogs;
  explicit registry return for the Room surface, the mobile More drawer, and
  the dialogs opened from it).
- Startup and sharing: controls stay blocked while startup-gated assets load
  (on-demand catalog loads leave the editor interactive), the error state
  offers a usable retry, `Share` produces a restorable URL, restore is
  one-shot, and invalid payloads recover the draft or fail to an empty scene.

`Furniture in room` is the primary text alternative to canvas interaction.
Check focus and shortcut behavior together when editing overlay or dialog
flows.

## Artifacts

- HTML report: `playwright-report/`
- Raw traces/screenshots/videos: `test-results/playwright/`

See also:

- [../../README.md](../../README.md)
- [dialogs-and-overlays.md](dialogs-and-overlays.md)
- [../testing/intentional-unit-exclusions.md](../testing/intentional-unit-exclusions.md)
