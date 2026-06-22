# editor-state

Purpose

- Own cross-feature editor state and transitions.

Contains

- Stores, selectors, and actions for runtime editor state.
- Cross-cutting coordinator modules (history/movement/selection actions,
  `startup-coordinator`, `preview-actions`, `selection-effects`, scene-reset/
  scene-draft/scene-url/restore-flow) that orchestrate writes across stores and
  scene commands for behavior spanning features.
- App-facing scene mirrors (`scene-state-store`, `scene-assets-store`).
- Contract modules used by scene and other runtime layers.
- Shared editor-state types.

Dialog-store responsibilities

- Owns the generic active-surface dialog state and dialog-open selectors.
- Exposes registry-driven open/close APIs (`openDialog`, `setDialogOpen`, `closeActiveDialog`).
- Reads cross-store state only through app-configured `DialogRuntimeContext`.
- Does **not** write to scene or selection stores; cross-store writes belong in
  the coordinator modules, not the dialog store.

Should not contain

- UI components.
- Imports from `src/app` or `src/features`.

Guideline

- Put state transitions and cross-cutting coordination here when they must stay
  consistent across features. Feature-internal orchestration stays in the
  owning feature.

See also

- `docs/architecture-boundaries.md`
