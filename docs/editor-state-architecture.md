# Editor State Architecture

This document captures the current Phase 1 boundary between the app shell, shared editor-state stores, and the scene domain.

## Goals

Phase 1 moves app-facing editor coordination out of `App.tsx`-local state and into explicit stores, while keeping scene-domain mutation logic inside `src/scene/`.

The main goals are:

- make app-shell UI state observable without imperative scene sync hooks
- keep scene/domain logic owned by the scene layer
- reduce the public `SceneRef` surface to the smallest contract still required by app features and browser tests
- make startup restore and selection side effects flow through explicit seams instead of ad hoc ref calls

## Current Layers

### App shell

The app shell lives under `src/app/` plus `src/App.tsx`.

It owns:

- overlays, dialogs, and toolbar composition
- startup orchestration and announcements
- keyboard routing and outliner focus behavior
- URL sharing and draft persistence wiring

It does not own scene history, placement math, collision, or furniture mutation rules.

### Editor-state stores

The shared app-facing stores live under `src/editor-state/`.

`dialog-store`

- owns dialog open/close state and dialog-specific payloads
- replaces dialog state that previously lived in app-local hooks

`editor-runtime-store`

- owns startup phase, restore outcomes, asset errors, and similar runtime coordination state
- gives the app shell a stable place to read startup and restore progress

`selection-meta-store`

- owns selection-side metadata that is not part of the scene domain itself
- currently includes outliner focus handoff requests and related app-only reconciliation state

`scene-state-store`

- mirrors app-facing scene read model state such as `history.present`, selected id, preview id, drag state, finishes, history availability, and editor messages
- is intentionally not yet the source of truth for scene mutations like add, move, rotate, delete, undo, or redo

## Scene ownership

The scene still owns:

- local history state and furniture mutation rules
- collision and layout constraints
- selection changes and object resolution
- camera controls and scene snapshots used for projection-driven behavior

This logic stays in `src/scene/` and `src/scene/internal/` so the app shell does not reimplement scene rules.

## App-to-scene seams

### `sceneCommands`

`SceneRef` has been removed. App-side code now uses `sceneCommands` as the imperative facade for scene-owned commands that still need mounted scene services.

The facade includes mutation commands such as add, select, move, rotate, delete, undo, redo, camera preset, focus, and startup restore. Snapshot and camera-position reads are still available for projection-driven behavior and browser tests.

### `scene-services`

`src/scene/internal/scene-services.ts` backs `sceneCommands` with a registry owned by the mounted `Scene` component.

Startup restore reaches the scene through `sceneCommands.restoreInitialLayout(...)`, which delegates to the registered service while keeping restore behavior scene-owned.

## Data flow

The current steady-state flow is:

1. Scene logic mutates local scene state.
2. Scene code writes app-facing mirrors into `scene-state-store`.
3. App selectors and local contexts read store state for overlays, preview, selection-derived UI, and startup coordination.
4. App-only side effects such as announcements and outliner focus run from focused controller hooks based on store changes.

This replaced the old `useSceneSync` pattern, which mixed imperative reads and app-side reconciliation logic.

## Selection and focus reconciliation

Selection side effects now live in app code instead of an imperative scene sync hook.

`useSelectionEffectsController` observes store-backed selection changes and coordinates:

- announcement timing
- source-aware selection behavior
- outliner focus requests via `selection-meta-store`

Mutation entry points are now split across focused controller hooks such as `useSelectionController`, `useMovementController`, `useHistoryController`, `useDeletionController`, and `useAssetLifecycleController`, with `App.tsx` composing those handlers into the app shell.

This keeps screen-reader and focus behavior in the app shell, where those responsibilities belong.

## Snapshot contract

`createSceneSnapshot()` is narrower than before.

It now returns only:

- `cameraPosition`
- `items` with rounded transforms and projected `pointerTarget`

Selected id, selected name, and item count are derived elsewhere when needed. This keeps snapshot reads focused on geometry/projection data rather than duplicating store-backed metadata.

## What Phase 1 does not finish yet

Phase 1 is still intentionally incomplete in a few areas:

- scene mutations still execute through the `sceneCommands` facade backed by registered scene services
- `scene-state-store` still mirrors scene state instead of owning mutation source of truth
- the scene still owns local history state internally
- `getSnapshot` still exists because pointer-target projection data is not store-backed yet

Those are the main follow-on seams for later refactor phases.
