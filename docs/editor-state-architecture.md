# Editor State Architecture

This document describes runtime editor-state responsibilities, boundaries, and
data flow between app shell composition, editor-state stores, and the scene
domain.

## Purpose and Scope

The editor-state layer provides shared state seams for cross-feature behavior.
It allows app and feature code to coordinate dialog orchestration, startup
runtime state, selection metadata, and app-facing scene mirrors without moving
scene-domain mutation rules out of the scene layer.

It is also the home for **cross-cutting coordinators**: module-level action
functions that orchestrate writes across several stores (and scene commands) for
behavior that spans features. These replaced the former app-level controller
hooks. App is composition-only; feature-internal orchestration stays in the
owning feature; only logic that coordinates multiple features lives here.

This document is architecture reference guidance. It focuses on stable
responsibility and boundaries, not migration history.

## Dialog Orchestration

Dialog orchestration is implemented by a generic registry-driven dialog store,
feature-owned dialog definitions, and app-layer bootstrap composition.

### Ownership and Boundary of Dialog Store

`src/editor-state/dialog-store.ts` owns only top-level dialog surface state,
generic dialog operations, and dialog-open selectors.

It does not own:

- layout transition policy
- feature-specific guard derivation logic
- DOM element lookup for focus restoration
- writes to scene or selection stores

### Shared Contract Types and Registry Model

`src/editor-state/dialog-contract.ts` defines the feature-facing dialog contract
consumed by feature definition modules without depending on the store:

- `DialogId`
- `DialogKind`
- `DialogOpenRequest`
- `DialogDefinition`
- `DialogRuntimeContext`

The runtime active-surface shape (`ActiveSurfaceState`) is store-internal and
defined in `src/editor-state/dialog-store.ts`.

Dialog definitions are registered through a single app bootstrap path in
`src/app/dialogs/bootstrap-dialog-registry.ts`.

Feature and shell definition modules declare per-dialog behavior, including
`kind`, open guards, and payload derivation. They are aggregated in
`src/app/dialogs/dialog-registry.ts`, keeping feature definitions free of
app-shell imports.

### Global Gating and Feature-Specific Guards

Dialog open behavior uses two layers of gating:

1. Store-level global gate: startup readiness.
2. Definition-level feature guards: dialog-specific `canOpen(...)` rules.

Startup readiness is the only store-level global gate. Additional rules such as
selection requirements or start-over eligibility belong in feature-level guards
or coordinator-level intent handling.

### Active-Surface Invariant and Blocking Semantics

Dialog store keeps one active top-level surface at a time:

- `activeSurface = null`, or
- one `ActiveSurfaceState` with `{ id, kind, payload }`.

`kind` drives blocking policy:

- `blocking`: contributes to `useIsBlockingOverlayOpen()`.
- `non-blocking`: remains open without asserting blocking-overlay behavior.

Room surface uses `non-blocking` semantics and remains mutually exclusive with
other top-level surfaces by the one-active-surface invariant.

### Payload Model and Focus Return

Payload is carried on the active surface and read with `useDialogPayload(id)`.
There is no dialog-specific top-level payload field.

The dialog store is focus-agnostic: it carries no return-focus token. Focus
return is owned entirely by the surface that opened the dialog:

- Blocking dialogs rely on Base UI restoring focus to their opener on close.
- The top header's mobile and room surfaces return focus explicitly through a
  small module-level registry in
  `src/app/chrome/top-header/header-focus-registry.ts` (keyed live trigger
  nodes), because their openers either unmount or are non-modal.
- The Start Over button becomes disabled after a reset, so the header walks to
  the next enabled control via `findNextEnabledHeaderControl`.

### External Reads Through DialogRuntimeContext

Dialog-store reads external state through `DialogRuntimeContext` configured by
app composition in `src/app/dialogs/bootstrap-dialog-registry.ts`.

This context currently exposes:

- dialog readiness
- selected furniture lookup
- start-over eligibility seam

### Disallowed Writes and Seam Constraints

Dialog-store must not:

- write to `scene-state-store`
- write to `selection-meta-store`
- depend on shell layout context

Cross-store writes stay in the editor-state coordination modules (or
feature-internal actions), not in the dialog store.

## Other Editor-State Stores

`editor-runtime-store`

- the single owner of the startup phase machine (`loading | ready | errored`)
- startup errors and restore outcomes/attempt tracking
- runtime loading flags
- the startup-cycle counters `sceneEpoch` (Scene remount key) and `retryToken`
  (re-triggers the manifest fetch), bumped by `beginAssetLoad`/`requestRetry`

`selection-meta-store`

- app-side selection metadata and focus handoff intent
- outliner and room-view focus reconciliation signals

`scene-state-store`

- app-facing scene read model state
- selection id, preview id, drag state, finishes, history availability,
  editor messages
- remains an app-facing mirror for scene-owned mutation domain behavior

`scene-assets-store`

- app-facing mirror of the startup-loaded catalog manifest (catalog,
  collections, environment config)
- lets features read catalog/finishes through narrow hooks instead of threaded
  props; populated by the startup bootstrap

## Coordination Modules

Cross-cutting behavior that spans features is implemented as module-level action
functions in `editor-state`, not as app controller hooks. They read/write the
stores above and call `sceneCommands`, and are imported directly by the UI
(buttons, command dispatch, scene callbacks).

- `history-actions`, `movement-actions`, `selection-actions` — undo/redo,
  move/rotate, and selection coordination, gated on startup readiness.
- `preview-actions` + `use-preview-reconciler` — preview hysteresis as module
  cells plus a thin reconciler effect.
- `startup-coordinator` — `completeAssetLoad` (one-time restore + mark ready),
  `notifyAssetError`, and `requestAssetRetry`; sources catalog/finishes from
  `scene-assets-store` and drives `editor-runtime-store`. The React-coupled
  manifest fetch lives in the feature hook `use-startup-bootstrap`, keyed on the
  store's `retryToken`.
- `scene-reset`, `scene-draft`, `scene-url`, `restore-flow` — scene-persistence
  coordination (reset op, localStorage autosave, URL serialization, restore
  orchestration). Homed here so coordinators can use them without a
  feature-to-feature import.

Feature-internal coordination (for example `features/selection/deletion-actions`,
`features/catalog/catalog-actions`) stays in the owning feature and imports
editor-state coordinators rather than sibling features.

### Selection-Effects (startup-subscription pattern)

`selection-effects` holds pending selection/source/focus intent in module cells
and reconciles it via a `scene-state-store` subscription started once at startup
(`startSelectionEffectsReconciler`). It uses `queueMicrotask` to preserve
note-before-reconcile ordering against synchronous `sceneCommands` writes. It
has no React surface.

## Scene Ownership and App-to-Scene Seams

Scene-domain mutation rules remain in `src/scene/` and `src/scene/internal/`.

App-side mutation intent uses `sceneCommands`, backed by scene service
registration in `src/scene/internal/scene-services.ts`.

Scene owns placement, collision, mutation rules, and camera behavior.
App/editor-state own orchestration and UI-facing state seams.

## Data Flow

Steady-state flow:

1. Scene code mutates scene-domain state.
2. Scene code publishes app-facing mirrors to scene/editor runtime seams.
3. Dialog definitions and editor-state coordinators read through store selectors
   and context seams.
4. App and feature UI use generic dialog actions/selectors for top-level
   surfaces.
5. Cross-cutting side effects (announcements, focus reconciliation, restore
   messaging) run in editor-state coordination modules.

## How to Use Dialog Store

### Register a Dialog Definition

1. Add/update a feature-owned definition module with `DialogDefinition`.
2. Include the definition in `bootstrap-dialog-registry.ts`.
3. Ensure bootstrap runs before dialog consumers render.

### Open, Close, and Read Dialog State

- open: `dialogActions.openDialog(id, request?)`
- set open/closed: `dialogActions.setDialogOpen(id, open, request?)`
- close active: `dialogActions.closeActiveDialog()`
- read open state: `useDialogOpen(id)`
- read payload: `useDialogPayload(id)`
- read active surface: `useActiveSurface()`

### Where Guards and Return-Focus Policy Belong

- global readiness gate: dialog-store startup gate
- feature guard logic: dialog definition `canOpen(...)` and/or feature
  coordinator intent checks
- focus target resolution to DOM: top-header or owning UI coordinator

### What Not to Put in Dialog Store

- layout transition state
- DOM node lookup/mapping
- cross-store writes
- feature-domain mutation effects

## What Remains by Design

These seams are intentional in the current architecture:

- scene-domain mutations execute through scene-owned services
- `scene-state-store` is app-facing mirror state for scene domain
- projection-driven geometry data still comes from scene snapshot seams where
  needed
- startup restore orchestration is editor-state coordination (the
  `startup-coordinator`) over scene-owned restore execution
