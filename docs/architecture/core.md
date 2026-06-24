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
- `model/` — pure scene-document helpers (defaults, at-defaults comparison).
- `persistence/` — scene state ↔ storage/URL.
- `commands/` — the `EditorCommand` vocabulary and its dispatch binding.
- `types/` — shared types.
- Root — the public, cross-layer contracts: `scene-contracts`,
  `scene-test-support`, `dialog-contract`.

## Store inventory

Each store is a Zustand vanilla store exposing selector hooks. "Written by" names
the only modules that should mutate it.

- **`scene-document-store`** — the app-facing scene **data model**: furniture
  history (the undo/redo timeline), selection id, preview id, drag state,
  finishes, and the floor-finish loading flag. Written by scene (publishing
  committed results up through `scene-contracts`) and by core operations.
  Ownership vs. the scene itself is the subject of
  [scene-and-core.md](scene-and-core.md).
- **`editor-lifecycle-store`** — the single owner of the startup phase machine
  (`loading | ready | errored`), asset errors, restore outcome/attempt tracking,
  and the startup-cycle counters `sceneEpoch` (Scene remount key) and
  `retryToken` (re-triggers the manifest fetch). `isEditorInteractive()` is the
  shared non-React readiness predicate operations gate on. Written by the startup
  bootstrap and `startup-coordinator`.
- **`assets-store`** — the startup-loaded catalog manifest (catalog,
  collections, environment config). Lets features read catalog/finishes through
  narrow hooks instead of threaded props. Written by the startup bootstrap.
- **`selection-focus-store`** — selection provenance (`selectedSource`, read to
  decide post-delete focus) plus focus-intent tokens (outliner and room-view
  focus handoff). The selection _pointer_ lives in `scene-document-store`; this
  is the view-side routing reconciled on top of it. Written by core operations.
- **`toolbar-geometry-store`** — the selected item's projected toolbar geometry,
  a one-writer (scene raf loop) / one-reader (placement hook) data pipe kept
  apart from selection focus routing. Written by scene via `scene-contracts`.
- **`dialog-store`** — generic active-surface dialog state, open/close
  operations, and dialog-open selectors. Model and invariants live in
  [dialogs-and-overlays.md](dialogs-and-overlays.md). Written by dialog actions.
- **`feedback-store`** — transient user-facing feedback channels: polite/
  assertive a11y announcements (plus the movement-announcement queue) and the
  visible `statusMessage` status line. Written by operations and features.

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
  `assets-store`, drives `editor-lifecycle-store`. The React-coupled manifest
  fetch lives in the feature hook `use-startup-bootstrap`, keyed on `retryToken`.
- `selection-effects` — pending selection/source/focus intent held in module
  cells and reconciled via a `scene-document-store` subscription started once at
  startup (`startSelectionEffectsReconciler`). Uses `queueMicrotask` to keep
  note-before-reconcile ordering against synchronous `sceneCommands` writes.
  `selectedSource` is written twice on purpose: eagerly by the selection ops for
  an immediate value, then again by the reconciler once the scene-driven
  `selectedId` settles. That double write is the deliberate cost of selection
  identity living in `scene-document-store` while its provenance lives in
  `selection-focus-store` — the scene drives the id asynchronously, so source can
  only be applied as pending intent on top. No React surface. (The most intricate
  operation — read it before changing it.)

Feature-internal orchestration (e.g. `features/selection/deletion-actions`,
`features/catalog/catalog-actions`) stays in the owning feature and imports core
operations rather than sibling features.

## Commands

`core/commands` defines the typed `EditorCommand` union and the dispatch binding:
`EditorCommandHandlers` (a handler-per-`kind` mapped type), `runEditorCommand` (a
map lookup, not a switch), and the ref-backed dispatch context
(`useCommandDispatch`). Adding a command is two type-enforced edits — a union
member and a handler key.

A command is a **declarative editor intent triggerable by the keyboard table or a
toolbar button**. Its implementation lives with its owning concern — a core
operation or feature action — and the command layer only wires `kind → impl`
(assembled in `app/commands/use-editor-command-handlers.ts`); App invents no
command semantics. Dispatch a command for that keyboard/toolbar vocabulary; call
operations or `sceneCommands` directly for intra-feature or intra-component logic.

The React dispatch binding lives in `core` (not `app` or `shared`) on purpose: it
imports the command vocabulary yet must be importable by feature buttons, and the
boundary rules forbid features importing `app` and forbid `shared` importing
`core` — so `core` is the only valid home. `core` already contains React anyway
(store selector hooks, the preview reconciler), so this is consistent, not an
exception.

## Persistence

`core/persistence` serializes the `scene-document-store` data model: `scene-draft`
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
