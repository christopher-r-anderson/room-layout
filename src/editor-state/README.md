# editor-state

Purpose

- Own cross-feature editor state and transitions.

Contains

- Stores, selectors, and actions for runtime editor state.
- Contract modules used by scene and other runtime layers.
- Shared editor-state types.

Dialog-store responsibilities

- Owns the generic active-surface dialog state and dialog-open selectors.
- Exposes registry-driven open/close APIs (`openDialog`, `setDialogOpen`, `closeActiveDialog`).
- Reads cross-store state only through app-configured `DialogRuntimeContext`.

Should not contain

- UI components.
- Imports from `src/app` or `src/features`.
- Cross-store side effects that write to scene or selection stores.

Guideline

- Put state transitions here when they must stay consistent across features.

See also

- `docs/architecture-boundaries.md`
