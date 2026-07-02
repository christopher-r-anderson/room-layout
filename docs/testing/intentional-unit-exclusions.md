# Intentional Unit-Test Exclusions

The standing record of code deliberately **not** unit-tested, with where it is
covered instead. This is the "lock-in" from the Phase 2 coverage triage
(`coverage-triage.md` Tier 2/3), now backed by the **verified** e2e coverage map
the e2e audit produced (`e2e-audit-ledger.md`).

Its job: stop a `0%` unit-coverage reading from looking like a gap, and stop us
re-litigating the same files. Coverage % is a prompt, not a goal.

A line belongs here only if one of these holds: it is covered by e2e (cited), it
is presentational/config/trivial glue, or it is an accepted gap (cited rationale).

## Covered by e2e, not unit

Thin glue wrappers around already-unit-tested pure cores (history transitions,
furniture operations, geometry, command maps). Unit-testing them would mean
mocking the pure core (testing the mocks) or rebuilding the live scene (which is
what e2e already does). Coverage was **verified** spec-by-spec during the e2e
gap analysis.

| module                                                        | covered by (e2e)                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `scene/internal/history/use-history-operations.ts`            | `editor-history`, `editor-hotkeys` (Ctrl+Z/Y), `drag-interaction`, `editor-accessibility-flows` (command+drag)   |
| `scene/internal/selection/use-selection-operations.ts`        | `drag-collision`, `drag-interaction` (preview vs select), `editor-hotkeys` (Escape clear, canvas select)         |
| `scene/internal/camera/use-camera-operations.ts`              | `editor-hotkeys` (presets, WASD/pan/zoom, **focus-selected `F`**), `selected-toolbar-placement`                  |
| `scene/internal/selection/use-toolbar-geometry-projection.ts` | `selected-toolbar-placement` (active projection), `selected-toolbar-idle` (idle no-op short-circuit)             |
| `scene/internal/furniture/use-furniture-operations.ts`        | `add-furniture`, `drag-interaction`/`drag-bounds`/`drag-collision`, `editor-hotkeys`, `editor-accessibility*`    |
| `app/commands/use-editor-command-handlers.ts`                 | exercised across the above; `focus-selected` and `focus-toolbar` routing now pressed in e2e                      |
| `app/commands/use-editor-focus-commands.ts`                   | `focusRoomView` (harness), `focusOutliner`/`focusInspector` (tab-order, post-delete), **`focusToolbar` Shift+T** |
| `features/keyboard/use-keyboard-shortcuts.ts`                 | `editor-hotkeys`, `editor-accessibility-flows` (dispatch + modal suppression)                                    |
| `features/startup/use-startup-bootstrap.ts`                   | `startup-loading`, `startup-load-error`, `url-restore` (restore matrix + one-shot guard)                         |

Note: `use-furniture-operations`'s decision logic was extracted to
`resolveMoveSelectionInHistory`/`resolveSetSelectionTransformInHistory`
(`furniture-operations.ts`) and is unit-tested there; only the residual hook glue
is e2e-covered.

## Presentational / config / trivial — no test needed

- Canvas composition: `scene/scene.tsx`, `app/App.tsx`, `main.tsx`,
  `app/chrome/editor-body.tsx`, `app/chrome/top-header/top-header-dialogs.tsx`.
- r3f environment / presentational: `environment/{lighting,room,wall-material}.tsx`,
  `camera/camera-controls.tsx`, `feedback/announcer.tsx`,
  `project-info/asset-attribution.tsx`, `startup/initialization-{error,progress}.tsx`,
  the confirmation-dialog components, `catalog-drawer.tsx`, `room-sidebar.tsx`.
- Config / registration: `*-dialog-definition.ts`, `camera-presets.ts`.
- Pure wiring: `core/operations/editor-reconcilers.ts` (composes three
  already-tested reconcilers).
- Debug / test infra: `shared/debug/perf-counters.ts`,
  `app/testing/use-test-state-bridge.ts`.
- `shared/ui/*` thin wrappers: styling wrappers over Base UI primitives
  (`tooltip`, `tabs`, `drawer`, `collapsible`, `scroll-area`, `progress`,
  `sonner`, `button`, `card`) and purely presentational bespoke pieces
  (`surface`, `caption`, `kbd`, `description-list`, the `*-variants` modules).
  These components are project-owned (see
  [ui-components.md](../architecture/ui-components.md)), but their interaction
  behavior (open/close, focus, dismissal) is Base UI's — tested upstream — and
  the project layer is composition and class strings, exercised throughout the
  e2e lane (dialog/drawer/toolbar flows, `editor-a11y-audits`). Unit tests here
  would re-test the library or pin class names. Components that **add a project
  contract** are unit-tested in place: `tool-button` (label/AT contract),
  `dialog`/`alert-dialog` (gutter survival, `data-size`),
  `keyboard-shortcut-display` (shortcut formatting).

## Accepted gaps (not covered anywhere, by choice)

Surfaced by the e2e gap analysis and deliberately left unfilled — each is covered
more cheaply elsewhere or is too low-value for the e2e cost. Recorded so the
choice is explicit, not an oversight.

- **Room finish and lighting mood applied in isolation** — only asserted via the
  `url-restore` serialization round-trip, not a standalone "change finish/mood →
  scene reflects it" e2e. The finish reducers are unit-tested; lighting-mood
  resolution lives in the pure, unit-tested
  `scene/internal/environment/lighting-mood.ts` (keeping `lighting.tsx`
  presentational); the floor-loading `aria-busy` state is in `room-controls` unit
  tests. Low marginal value.
- **Genuine no-space error presence** — `add-furniture` asserts the error never
  fires on valid adds; it does not drive the room to true saturation to assert the
  error appears. Placement-search is unit-tested. Low value, brittle to set up.
- **Outliner collapse persistence across reload** — the collapse toggle + focus is
  e2e-tested; the storage round-trip across a reload is not. Trivial persistence.
- **Mobile docked-toolbar placement** — desktop floating placement is thoroughly
  e2e-tested (`selected-toolbar-placement`); the mobile docked variant is a simpler
  CSS dock, asserted only via `data-selected-toolbar-mode`.
- **Native share path in e2e** — `url-restore` exercises the clipboard fallback;
  the `navigator.share` path is unit-tested (`share-scene.test`) and impractical in
  headless CI.
- **"No item selected" focus-redirect branches** of `focusInspector`/`focusToolbar`
  (announce + redirect to outliner) — the selected branches are e2e-covered; these
  empty-selection branches are not. Minor.

## Out of scope (standing)

Chasing a coverage number; re-testing Base UI primitive behavior through
`shared/ui` wrappers (the library tests that; project-added contracts there
**are** in scope — see above); testing pure-constant modules
(`domain/geometry/room-metrics.ts`).
