# E2E Test Audit Ledger

A per-spec audit of the Playwright e2e suite (14 functional specs + 2 perf), with
an extra lens beyond the unit audit: **does this deserve to be an e2e test?** E2e
tests are slow and flake-prone, and `docs/architecture/testing.md` itself says to
push exact-value checks down to deterministic unit tests. So each spec is judged
on four axes: what it tests, **e2e-justification**, validity, and determinism.

**Migration discipline:** "trim from e2e" never means "delete coverage." For each
redundant assertion, first confirm (or add) the unit equivalent so the issue is
still caught at the cheaper layer, _then_ remove it from e2e.

Verdicts: **genuine-e2e** (needs the browser), **partially-redundant** (some
assertions belong at unit), **could-be-unit** (mostly redundant).

## Status

- **Runner investigation — resolved, no change.** We drive Playwright Test
  directly (own config/runner), separate from Vitest. That is the correct,
  idiomatic split for true e2e: this suite depends on Playwright-Test-only
  features (`page.route` network interception, CDP tracing, `@axe-core/playwright`,
  the production `vite preview` webServer, the trace viewer, `projects`/sharding).
  "Integrating e2e into Vitest" generally means **Vitest Browser Mode**, which is
  for _component_ tests in a real browser, not full e2e — the Vitest docs
  themselves recommend Playwright/Cypress for e2e. Keep the current setup. (A
  separate, optional future idea: Browser Mode for some _component/hook_ tests vs
  jsdom — not the e2e suite.)
- **Phase A — done.** Replaced the `holdKeyUntilCameraMoves` poll-until-condition
  anti-pattern with a fixed bounded `holdKey` across the harness, `editor-hotkeys`,
  and the camera-nudge perf spec; assertions now check the durable "camera moved"
  invariant. Validated: the 6 camera hotkey tests pass.
- **Phase B — done (migrate-not-delete).** Trimmed exact-value/logic checks that
  belong at unit, after verifying each unit equivalent:
  - `drag-bounds`: assert the clamp invariant (moved toward wall, stayed in room),
    not the exact `2.425` (`clampToBounds`/`wall-clearance` unit-owned).
  - `editor-accessibility(-flows)`: assert each Arrow/Shift/Alt variant routes and
    moves; drop the exact `+0.5/+1.5/+1.6` and `-0.5` (step deltas pinned in
    `use-keyboard-shortcuts.test`). Kept the genuine undo/redo interleave parity.
  - `editor-hotkeys` rotate test: drive undo/redo parity off a captured runtime
    angle, not the magic normalized radians (step pinned in `movement-actions.test`).
  - `url-restore`: removed 7 pure parse/validate tests (unit-covered by
    `scene-url.test`/`restore-flow.test`/`scene-draft.test`), kept one
    malformed→error-UI test + all full-app flows; replaced a clear-toasts
    `waitForTimeout(500)` with a status-empty wait.
- **Phase C — done.** `editor-history` slimmed from a 3-op × undo3 × redo3 matrix
  to an integration smoke (real add+rotate commit to history; undo via Ctrl+Z and
  toolbar button; redo re-applies) — the stack ordering is unit-owned, delete-undo
  stays in `editor-hotkeys`. The a11y-flow "consolidation" was **declined**: the
  three a11y specs share an add→select→delete _pattern_ but have distinct purposes
  (axe audits vs focus-to-sibling vs focus reconciliation) and different setups, so
  merging would couple unrelated concerns; the real overlaps were already trimmed
  in Phase B. Fixed one redundant trailing `itemCount` assertion in `a11y-audits`.
- **Phase D (perf) — done.** Decision: don't gate CI on headless frame time
  (SwiftShader software rendering is non-representative). Instead:
  - Added `e2e/selected-toolbar-idle.spec.ts` — a **deterministic** gate: with the
    camera at rest, the floating-toolbar store must not write (idle writes are
    structurally zero regardless of frame rate). Runs in the normal CI lane; catches
    work-churn regressions (lost memo / render loop).
  - Deleted both perf specs (trace collectors that never gated and measured
    non-representative frame time) and stripped the dead CDP-trace/artifact infra,
    `perf-meta.ts`, the `perf-chromium` project, and the `test:browser:perf` script.
  - Documented the perf strategy in `docs/architecture/testing.md`: deterministic
    e2e gates for churn, interactive profiling + future RUM for real frame-time.
    Deferred: bundle-size budget (after the lazy-load-the-3D split), RUM.
- **Phase E — done.** Scoped axe to the WCAG 2.1 A/AA conformance target (subset of
  the default, so no new failures). Replaced the synthetic-event context-menu check
  with a real right-click reading `defaultPrevented`. Documented + asserted the
  `add-furniture` setup drag. **Left** (conscious "not worth it"): `drag-collision`
  brittleness (works, asserts the right relative invariants; simplifying a working
  collision test is risky for marginal gain) and `editor-dialogs` project-info exact
  strings (low-churn attribution; verifying the links render in the real dialog has
  value).
- **Coverage gap analysis — done.** Beyond the quality audit above, a flow-vs-spec
  gap pass (UI/code-derived flow inventory cross-checked against every spec, since
  `editor-workflow.md` is a curated checklist, not exhaustive). It **verified** the
  unit-work assumption that the `use*Operations` hook wrappers are e2e-covered (they
  are) and found two real holes, now filled: **focus-selected (`F`)** camera framing
  and **focus-toolbar (`Shift+T`)** — plus a cheap parity gap, the **rotation (deg)**
  detail field. Accepted gaps (covered cheaper or low value) are recorded in
  `intentional-unit-exclusions.md`. Targeted `editor-workflow.md` additions for the
  two notable omissions (focus-selected, pane-focus shortcuts).

## Per-spec

| spec                                      | verdict               | notes                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selected-toolbar-placement.spec.ts`      | genuine-e2e           | **The model.** Live projection + DOM layout vs header chrome — only a browser can do this. Asserts durable invariants (no-intersection, mode stays `floating`), explicitly defers exact/hysteresis values to unit (`:34-39`), fixed bounded hold (`:111`). Emulate this.                                                                                                         |
| `editor-dialogs.spec.ts`                  | genuine-e2e           | Best-justified. One-active-surface mutual exclusion, Escape-closes-and-restores-focus, blocking vs non-blocking, Start-Over focus-move, mobile responsive focus-return. All real focus/inert behavior. Minor: project-info exact string/link assertions (`:60-73`) could be lighter.                                                                                             |
| `startup-loading.spec.ts`                 | genuine-e2e           | Loading screen gates the editor until assets resolve; real network-route interception + Suspense. Clean, event-gated.                                                                                                                                                                                                                                                            |
| `startup-load-error.spec.ts`              | genuine-e2e           | Asset-failure → error screen → Retry → recovery. Real abort/continue routing + error boundary remount. Strong.                                                                                                                                                                                                                                                                   |
| `add-furniture.spec.ts`                   | genuine-e2e           | Real picker → placement-slot-search → add across multiple items; unique-id under repeated adds. Minor: drag at `:28` is load-bearing setup with a magic magnitude and no assertion on its result.                                                                                                                                                                                |
| `drag-interaction.spec.ts`                | genuine-e2e           | Drag+undo/redo, selected-vs-preview independence, preview-clear on background click — real R3F pointer/hover semantics. **Except** the context-menu test (`:216-238`) uses a synthetic `dispatchEvent` + checks its return, a weak proxy; use a real right-click.                                                                                                                |
| `editor-a11y-audits.spec.ts`              | genuine-e2e           | axe over shell/dialogs/outliner/selected/empty — needs the real computed a11y tree. Concerns: axe runs **unscoped** (`axe.ts:5`, no `withTags`); redundant trailing `itemCount).toBe(0)` (`:78`) after `waitForItemCount(0)` (`:73`).                                                                                                                                            |
| `drag-collision.spec.ts`                  | genuine-e2e (brittle) | Defensible — asserts _relative invariants_ (neighbor unmoved, penetration blocked, `:130-132`), not resolved coordinates. But over-engineered: tuned `*0.6`/`*0.9` deltas + many throw-if-missing guards. Resolution math is unit-owned; consider simplifying.                                                                                                                   |
| `drag-bounds.spec.ts`                     | partially-redundant   | Pipeline (pointer drag engages clamp) is legit; the exact clamp value `x ≈ 2.425` to 2 decimals (`:28,37-38`) re-tests `wall-clearance`/`clampToBounds` math already unit-pinned. Trim to the invariant (moved + in-bounds).                                                                                                                                                     |
| `editor-accessibility-flows.spec.ts`      | partially-redundant   | Keep: undo focus-reconciliation, no-announce-on-preview, focus-trap/inert, Tab traversal, mobile roving toolbar. Trim: exact Arrow step magnitudes (`:34-44`) and `commandPosition[0]).toBeCloseTo(-0.5)` (`:93`); undo/redo parity (`:79-119`) is largely reducer re-verification.                                                                                              |
| `editor-accessibility.spec.ts`            | partially-redundant   | Keep: focus-moves-to-sibling-after-delete + polite announcement (`:53-54`). Trim: exact position `toBeCloseTo(-0.5)` (`:41`). Overlaps the a11y-audits selected-item flow.                                                                                                                                                                                                       |
| `editor-hotkeys.spec.ts`                  | partially-redundant   | Keep: modal WASD-suppression, arrow-moves-object-not-camera routing, non-blocking-sidebar keeps WASD live, canvas-browse preview/Enter + announcements. Trim: rotation-radian undo/redo round-trips (`:174-211`, reducer+matcher logic). **Determinism: `holdKeyUntilCameraMoves` used at `:286,304,322,332,342,433,460`.**                                                      |
| `url-restore.spec.ts`                     | partially-redundant   | Keep full-app flows: Share serialize→clipboard→navigate round-trip (`:454`), one-shot guard across retry (`:297`), draft persistence across reload (`:535`), clipboard fallback (`:331`). Trim parse/validate-outcome cases (`:269,286,654,686,700,217,234,595`) — covered exhaustively by `scene-url.test.ts` + `restore-flow.test.ts`. Replace `waitForTimeout(500)` (`:767`). |
| `editor-history.spec.ts`                  | could-be-unit         | add→rotate→delete × undo×3 × redo×3 with exact rotationY round-trips (`:11-68`) is a history-reducer matrix run through the UI — unit-covered. Slim to a smoke: one undo via button + Ctrl+Z dispatches the command.                                                                                                                                                             |
| `perf/drag-interaction.perf.spec.ts`      | perf-lane             | Captures a CDP trace over drags. Assertions are smoke-only (`position changed`, `trace size > 0`, `:70-71`) — no threshold/baseline gate, so it's a collector, not a detector. Bounded drag inputs (good).                                                                                                                                                                       |
| `perf/selected-camera-nudge.perf.spec.ts` | perf-lane             | Trace + toolbar-emission counters. Assertions are `>= 0` (`:114-119`, trivially true → catches nothing). **Determinism: `holdKeyUntilCameraMoves` (`:55,66`)** + fixed sleeps (`:56,69`).                                                                                                                                                                                        |

## Cross-cutting findings

1. **`holdKeyUntilCameraMoves` violates the project's own determinism rule.** The
   harness ships it (`editor-harness.ts:507-527`) and it's used in `editor-hotkeys`
   and `selected-camera-nudge.perf`. `testing.md:67-72` explicitly forbids holding
   an input until a polled condition (magnitude becomes unbounded under parallel
   load). Highest flake risk, and self-contradictory with the stated lane rules. The
   fix is the guide-compliant fixed bounded hold that `selected-toolbar-placement`
   already uses (`:111`).
2. **Exact-value math/logic checks pushed into e2e instead of unit.** drag-bounds
   clamp value; accessibility step-sizes/coordinates; hotkeys rotation radians;
   url-restore parse/validate. The guide says push these down. Migrate (verify/add
   unit, then trim) — don't just delete.
3. **`editor-history` is a reducer matrix in a browser** — slim to a smoke.
4. **Both perf specs lack real thresholds** — they collect baseline artifacts but
   never fail on regression (`>= 0` / position-changed). Decide intent: regression
   gate vs explicitly-a-collector.
5. **Validity nits:** axe unscoped (`axe.ts:5`); synthetic context-menu vs real
   right-click; redundant trailing assertions (`a11y-audits:78`); unconditional
   sleeps (`url-restore:767`, perf `:56`); duplicated select→edit→delete flow across
   three a11y specs; brittle drag-collision deltas.

## Proposed phases (for discussion)

- **A — Determinism / flake (correctness, highest priority):** replace
  `holdKeyUntilCameraMoves` with a fixed bounded hold across `editor-hotkeys` +
  `selected-camera-nudge.perf` (and remove the banned harness helper); replace
  unconditional sleeps with condition waits.
- **B — "Deserves e2e" migrations:** per item, confirm/add the unit equivalent,
  then trim the redundant exact-value/logic assertion to a durable invariant
  (drag-bounds, accessibility(-flows) coordinates, hotkeys rotation, url-restore
  parse/validate).
- **C — Whole-spec rationalization:** `editor-history` → smoke; consolidate the
  triplicated a11y select/edit/delete flow.
- **D — Perf intent:** add thresholds/baseline comparison or document as collectors;
  fix camera-nudge determinism (folds into A).
- **E — Validity nits:** scope axe to WCAG tags; real right-click context-menu; drop
  redundant trailing assertions; simplify drag-collision.

Models to emulate: `selected-toolbar-placement`, `editor-dialogs`, `startup-*`.
