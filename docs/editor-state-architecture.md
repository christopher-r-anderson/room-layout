# Editor State Architecture

This document describes runtime editor-state responsibilities, boundaries, and
data flow between app shell composition, editor-state stores, and the scene
domain.

## Purpose and Scope

The editor-state layer provides shared state seams for cross-feature behavior.
It allows app and feature code to coordinate dialog orchestration, startup
runtime state, selection metadata, and app-facing scene mirrors without moving
scene-domain mutation rules out of the scene layer.

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

`src/editor-state/dialog-contract.ts` defines dialog contract types, including:

- `DialogId`
- `DialogKind`
- `DialogAccessPoint`
- `DialogOpenRequest`
- `DialogDefinition`
- `DialogRuntimeContext`
- `ActiveSurfaceState`

Dialog definitions are registered through a single app bootstrap path in
`src/app/dialogs/bootstrap-dialog-registry.ts`.

Feature and shell definition modules declare per-dialog behavior, including
`kind`, open guards, payload derivation, and default return-focus access point.

### Global Gating and Feature-Specific Guards

Dialog open behavior uses two layers of gating:

1. Store-level global gate: startup readiness.
2. Definition-level feature guards: dialog-specific `canOpen(...)` rules.

Startup readiness is the only store-level global gate. Additional rules such as
selection requirements or start-over eligibility belong in feature-level guards
or controller-level intent handling.

### Active-Surface Invariant and Blocking Semantics

Dialog store keeps one active top-level surface at a time:

- `activeSurface = null`, or
- one `ActiveSurfaceState` with `{ id, kind, payload, returnFocusAccessPoint }`.

`kind` drives blocking policy:

- `blocking`: contributes to `useIsBlockingOverlayOpen()`.
- `non-blocking`: remains open without asserting blocking-overlay behavior.

Room surface uses `non-blocking` semantics and remains mutually exclusive with
other top-level surfaces by the one-active-surface invariant.

### Payload Model and Return-Focus Access Points

Payload is carried on the active surface and read with `useDialogPayload(id)`.
There is no dialog-specific top-level payload field.

Return focus uses semantic `DialogAccessPoint` tokens, not layout-specific DOM
ids. Top-header code resolves those semantic tokens into concrete elements.

Current access-point token set:

- `top-header-room`
- `top-header-keyboard-shortcuts`
- `top-header-project-info`
- `top-header-start-over`
- `top-header-more-actions`
- `room-view`
- `outliner`
- `selection-inspector`
- `none`

### Responsive Continuity Ownership

Responsive continuity behavior belongs to top-header orchestration code in
`src/app/chrome/top-header/`, not dialog-store.

Dialog-store remains layout-agnostic. It exposes semantic state and actions;
top-header coordinator logic decides responsive handoff and focus fallback.

### External Reads Through DialogRuntimeContext

Dialog-store reads external state through `DialogRuntimeContext` configured by
app composition in `src/app/dialogs/dialog-context-builder.ts`.

This context currently exposes:

- dialog readiness
- selected furniture lookup
- start-over eligibility seam

### Disallowed Writes and Seam Constraints

Dialog-store must not:

- write to `scene-state-store`
- write to `selection-meta-store`
- depend on shell layout context

Cross-store writes stay in app/feature controller orchestration.

## Other Editor-State Stores

`editor-runtime-store`

- startup phase and runtime readiness state
- startup errors and restore outcomes
- runtime loading flags

`selection-meta-store`

- app-side selection metadata and focus handoff intent
- outliner focus reconciliation signals

`scene-state-store`

- app-facing scene read model state
- selection id, preview id, drag state, finishes, history availability,
  editor messages
- remains an app-facing mirror for scene-owned mutation domain behavior

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
3. Dialog definitions and app controllers read through store selectors and
   context seams.
4. App and feature UI use generic dialog actions/selectors for top-level
   surfaces.
5. App-side side effects (announcements, focus reconciliation, restore
   messaging) run in controller hooks.

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
- read semantic return focus token: `useReturnFocusAccessPoint()`

### Where Guards and Return-Focus Policy Belong

- global readiness gate: dialog-store startup gate
- feature guard logic: dialog definition `canOpen(...)` and/or feature
  controller intent checks
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
- startup restore orchestration remains app-level coordination over
  scene-owned restore execution
