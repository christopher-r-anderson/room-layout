# editor-state

Purpose

- Own cross-feature editor state and transitions.

Contains

- Stores, selectors, and actions for runtime editor state.
- Contract modules used by scene and other runtime layers.
- Shared editor-state types.

Should not contain

- UI components.
- Imports from `src/app` or `src/features`.

Guideline

- Put state transitions here when they must stay consistent across features.

See also

- `docs/architecture-boundaries.md`
