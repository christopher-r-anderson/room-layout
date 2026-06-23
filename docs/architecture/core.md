# Core

`src/core` is the headless editor: the domain state, the operations on it, and
the contracts other layers use. Features are the UI rendered over it; `app` only
composes. This doc is the layer reference — what lives here and who owns what.
For specifics, follow the pointers into the code.

Two concepts have their own docs:

- The scene⇄core seam (who owns furniture data vs. the rules that change it):
  [scene-and-core.md](scene-and-core.md).
- The dialog/overlay model: [dialogs-and-overlays.md](dialogs-and-overlays.md).

## Layout

- `stores/` — the state owners (below).
- `operations/` — cross-cutting operations over the stores.
- `persistence/` — scene state ↔ storage/URL.
- `commands/` — the `EditorCommand` vocabulary and its dispatch binding.
- `types/` — shared types.
- Root — the public, cross-layer contracts: `scene-contracts`,
  `scene-test-support`, `dialog-contract`.

## Store inventory

Each store is a Zustand vanilla store exposing selector hooks. "Written by" names
the only modules that should mutate it.

- **`scene-state-store`** — the app-facing scene **data model**: furniture
  history (the undo/redo timeline), selection id, preview id, drag state,
  finishes, editor messages. Written by scene (publishing committed results up
  through `scene-contracts`) and by core operations. Ownership vs. the scene
  itself is the subject of [scene-and-core.md](scene-and-core.md).
- **`editor-runtime-store`** — the single owner of the startup phase machine
  (`loading | ready | errored`), asset errors, restore outcome/attempt tracking,
  floor-finish loading, and the startup-cycle counters `sceneEpoch` (Scene
  remount key) and `retryToken` (re-triggers the manifest fetch). Written by the
  startup bootstrap and `startup-coordinator`.
- **`scene-assets-store`** — the startup-loaded catalog manifest (catalog,
  collections, environment config). Lets features read catalog/finishes through
  narrow hooks instead of threaded props. Written by the startup bootstrap.
- **`selection-meta-store`** — selection metadata and focus-intent tokens
  (outliner and room-view focus handoff). Written by core operations and scene.
- **`dialog-store`** — generic active-surface dialog state, open/close
  operations, and dialog-open selectors. Model and invariants live in
  [dialogs-and-overlays.md](dialogs-and-overlays.md). Written by dialog actions.
- **`announcement-store`** — polite/assertive a11y announcements and the
  movement-announcement queue. Written by operations and features.

## Operations

Cross-cutting behavior that spans features is implemented as module-level
functions in `core/operations`, not as app controller hooks. They read and write
the stores above and call `sceneCommands`, and the UI imports them directly
(buttons, command dispatch, scene callbacks). This is the home that makes the
cross-feature import ban possible — features coordinate by calling a shared
operation, never by importing a sibling feature.

- `history-actions`, `movement-actions`, `selection-actions` — undo/redo,
  move/rotate, selection; gated on startup readiness.
- `preview-actions` + `use-preview-reconciler` — preview hysteresis as module
  cells plus a thin reconciler effect.
- `startup-coordinator` — `completeAssetLoad` (one-time restore + mark ready),
  `notifyAssetError`, `requestAssetRetry`. Sources catalog/finishes from
  `scene-assets-store`, drives `editor-runtime-store`. The React-coupled manifest
  fetch lives in the feature hook `use-startup-bootstrap`, keyed on `retryToken`.
- `selection-effects` — pending selection/source/focus intent held in module
  cells and reconciled via a `scene-state-store` subscription started once at
  startup (`startSelectionEffectsReconciler`). Uses `queueMicrotask` to keep
  note-before-reconcile ordering against synchronous `sceneCommands` writes. No
  React surface. (The most intricate operation — read it before changing it.)

Feature-internal orchestration (e.g. `features/selection/deletion-actions`,
`features/catalog/catalog-actions`) stays in the owning feature and imports core
operations rather than sibling features.

## Commands

`core/commands` defines the typed `EditorCommand` union, `runEditorCommand`, and
the ref-backed dispatch context (`useCommandDispatch`). UI controls dispatch a
command rather than wiring a handler; the command maps to an operation or scene
call. See `core/commands/editor-command.ts` for the vocabulary.

## Persistence

`core/persistence` serializes the `scene-state-store` data model: `scene-draft`
(localStorage autosave), `scene-url` (shareable URL codec), `scene-reset`, and
`restore-flow` (startup restore orchestration). Consumed by operations — chiefly
`startup-coordinator`. These are homed in `core` (not the `url-scene` feature) so
operations can use them without a cross-feature import.

## Boundaries

`core` must not import `app` or `features`, and must not contain UI components
(enforced in `eslint.config.js`; see [architecture.md](architecture.md)). Within
`core`, the `dialog-store` additionally must not write to other stores — see
[dialogs-and-overlays.md](dialogs-and-overlays.md). Cross-store writes belong in
`operations`.
