# Plan: Migrate Action-Shaped Controllers Into Store-Reading Modules (Handover §6.2)

> **Status:** Tier 1 shipped (green) — history, movement, selection are feature
> action modules; App no longer instantiates those hooks. Tier 2 blocked on a
> direction decision (see below). Branch
> `editor-surface-keyboard-architecture-refactor`.
> **Depends on:** §6.1 (shipped) — `selectionEffects` is now a module, so
> controllers no longer receive it as a param.
> **Precedent:** `src/features/selection/selected-item-detail-actions.ts`
> (Cluster B) — plain exported intent-named functions that read
> `editorRuntimeStore.getState().startupPhase === 'ready'` and
> `selectSelectedFurniture(sceneStateStore.getState())`, calling
> `sceneCommands`/`sceneStateActions`/`announcementActions` directly.

## Goal

Stop App from being the controller orchestrator. Action-shaped controllers
become plain modules in their owning feature; the `EditorCommandApi` and feature
components reference module functions directly instead of hook instances. Each
controller that stops being a hook removes one reason App must instantiate it
centrally.

## Controller disposition

All eight action controllers are imported only by `App.tsx` today.

### Stays a hook (genuinely stateful — do NOT convert)

- `use-preview-controller` — owns `scenePreviewClearTimeoutRef`,
  `previewSourceRef`, hysteresis timer, and two lifecycle effects.
- `use-canvas-keyboard-controller` — owns `previewedIdRef` + a sync effect.

### Tier 1 — clean modules (no App-coupling) — THIS PHASE

Inputs are only `editorInteractionsEnabled` (→ `editorRuntimeStore.getState()`),
constants, and store selectors (→ `.getState()`). No App callbacks, no
App-local state, no startup config.

| Controller                 | New module                                | Functions                                               | Sourced reads                                                                                             |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `use-history-controller`   | `features/history/history-actions.ts`     | `undo`, `redo`                                          | enabled→store                                                                                             |
| `use-movement-controller`  | `features/selection/movement-actions.ts`  | `moveSelection`, `rotateSelection`                      | enabled→store, `ROTATION_STEP_RADIANS` constant, selected furniture→`selectSelectedFurniture(getState())` |
| `use-selection-controller` | `features/selection/selection-actions.ts` | `selectByCanvasPointer`, `selectById`, `clearSelection` | enabled→store, `selectedId`→`getState()`                                                                  |

Consumers after conversion: `EditorCommandApi` calls module fns directly;
`use-canvas-keyboard-controller` imports `selectById` directly (drops one thread);
the EditorBody/outliner threads keep passing module fns until §6.3.

### Tier 2 — forked (App-derived deps) — NEEDS A DECISION (next phase)

These cannot become clean feature modules without first deciding how their
App-derived inputs are sourced, because a feature module **may not import
`@/app/**`\*\*:

- `use-deletion-controller` — needs `focusRoomView` (App DOM callback over the
  editor-refs `roomViewRef`) and `pendingDeleteFurniture` (dialog payload).
- `use-start-over-controller` — needs `clearPreview` (preview-hook method),
  `canStartOver`/`defaults` (derived from `environmentConfig`).
- `use-catalog-controller` — needs `catalogIdToAdd` (App-local `useState`,
  slated to move into the catalog feature in §6.3).
- `use-asset-lifecycle-controller` — needs startup config (`catalog`, finish ids
  from `environmentConfig`, startup handlers) and owns `restoreAttemptedRef`.
- `use-share-controller` — needs `activeFloor/WallFinishId` (App-derived);
  returns a Promise and is intentionally still a callback per the handover.

These are intertwined with §6.3 (relocating catalog state, environmentConfig
access, the post-delete focus hand-off). They are deliberately out of Tier 1.

## Tier 1 migration (one controller per slice, each green)

For each: create the feature module with intent-named exported functions reading
stores; delete the controller hook + repoint its test to the module (mock the
module where consumers are tested, or test the module directly like
`selected-item-detail-actions.test.ts`); update `App.tsx` to reference the module
functions in `commandApi`/`handlers`/threads; update `use-canvas-keyboard-controller`
to import `selectById` directly (selection slice).

- **Slice A1** — history → `features/history/history-actions.ts`.
  `refactor(history): move undo/redo into a history action module`
- **Slice A2** — movement → `features/selection/movement-actions.ts`.
  `refactor(selection): move movement handlers into an action module`
- **Slice A3** — selection → `features/selection/selection-actions.ts`; canvas
  keyboard imports `selectById` directly.
  `refactor(selection): move selection handlers into an action module`

Validation gate per slice: `pnpm fix` → `pnpm typecheck` → `pnpm lint` →
`pnpm test:run` → `pnpm knip`; for the selection/movement/history behavior also
`pnpm test:e2e e2e/editor-accessibility-flows.spec.ts e2e/editor-hotkeys.spec.ts`.

## Tier 2 — concrete blockers found (post Tier 1)

Each remaining controller is blocked on state/callbacks that live in App and are
**not** in a store, so a feature module cannot reach them without new seams:

- **deletion** — only blocker is `focusRoomView` (App rAF + editor-refs
  `roomViewRef`). `pendingDeleteFurniture` is readable from the dialog store;
  dialog actions are importable; items/source/enabled are `getState()`. Cleanly
  unblocked by modelling **post-delete room-view focus as a focus-intent** in
  `selection-meta-store` (mirrors the existing outliner-focus request) that
  EditorBody consumes — a contained, architecturally consistent addition.
- **catalog** — `handleAddFurniture` needs `catalogIdToAdd` (App `useState`).
  Coupled to §6.3's plan to move catalog-id state into the catalog feature.
- **start-over** — needs `canStartOver`/`defaults` (derived from
  `environmentConfig`, which is **not** in a store) and `clearPreview` (a method
  of the preview hook, which stays a hook). Coupled to environmentConfig access
  - preview seam.
- **asset-lifecycle** — needs startup config (catalog, finish ids from
  `environmentConfig`, startup handlers from `useStartupState`) and owns
  `restoreAttemptedRef`. Most startup-coupled; likely moves only when startup
  state is restructured.
- **share** — needs App-derived `activeFloor/WallFinishId`; returns a Promise;
  handover defers it as a callback.

**Finding:** the handover assumed these convert via `getState()`, but the real
blockers are App-held state not yet in stores (`environmentConfig`,
`catalogIdToAdd`) and an App DOM callback (`focusRoomView`) — i.e. §6.3-style
relocations. Tier 1 was the genuinely-decoupled subset.

### Direction options (awaiting decision)

- **D1 — pivot to §6.3 next (recommended).** Tier 1 banked the decoupled §6.2
  wins. Do §6.3 (de-thread overlay/top-header; relocate catalog-id state and
  environmentConfig access; add the post-delete focus-intent), and convert each
  remaining controller as its seam lands. Matches the handover's "6.3 removes the
  reason the threading exists" logic.
- **D2 — push §6.2 further now** by adding the enabling seams first (focus-intent
  for room-view; an environmentConfig/defaults store), then convert
  deletion/start-over/catalog. More work; overlaps §6.3.
- **D3 — convert only deletion now** via the post-delete focus-intent (the one
  self-contained case), and leave start-over/catalog/asset-lifecycle/share for
  §6.3.

## Risks

- App rewiring (commandApi/handlers/threads) is the main surface; typecheck +
  the keyboard/a11y e2e flows are the guard.
- `knip` must stay at baseline (watch removed controller exports + new module
  exports).
- Selection's `handleSelectById` return contract (`SelectByIdResult`) must be
  preserved for the canvas-keyboard browse+select path.
