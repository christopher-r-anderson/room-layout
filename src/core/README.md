# core

Purpose

- Own the headless editor core: cross-feature stores, operations, and contracts.

Layout

- `stores/` (state owners), `operations/` (cross-cutting operations),
  `persistence/` (storage/URL codecs), `commands/` (the `EditorCommand`
  vocabulary), `layout/` (editor rect and surface-focus contexts), and the
  root cross-layer contracts (the engine port and `dialog-contract`).
- The folder-by-folder reference, the store access pattern, and the state
  scoping model live in `docs/architecture/core.md`.

Dialog-store responsibilities

- Owns the generic active-surface dialog state and dialog-open selectors.
- Exposes registry-driven open/close APIs (`openDialog`, `setDialogOpen`, `closeActiveDialog`).
- Reads cross-store state only through app-configured `DialogRuntimeContext`.
- Does **not** write to scene or selection stores; cross-store writes belong in
  `operations/`, not the dialog store.

Should not contain

- UI components.
- Imports from `src/app`, `src/features`, or `@/scene` (core owns the engine
  ports; it must not import the scene adapter).

Guideline

- Put state transitions and cross-cutting operations here when they must stay
  consistent across features. Feature-internal orchestration stays in the
  owning feature.

See also

- `docs/architecture/architecture.md`
