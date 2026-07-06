# core

Purpose

- Own the headless editor core: cross-feature stores, operations, and contracts.

Layout

- `stores/` — the zustand stores: `create()` bound hooks over pure-data state,
  each with a module-level `xActions` mutation surface and narrow selector
  hooks. Covers the scene data model (`scene-document-store`), the
  catalog/environment manifest (`assets-store`), and the startup/asset-loading
  state (`editor-lifecycle-store`, `collection-loading-store`).
- `operations/` — cross-cutting operations over the stores (history/movement/
  selection actions, `startup-coordinator`, the collection load pipeline
  (`collection-loader`, `collection-bytes`), preview actions + reconciler,
  `selection-effects`, `draft-persistence`). These orchestrate writes across
  stores and scene commands for behavior that spans features; standing
  reconcilers are built with `createReconciler` and started from
  `startEditorReconcilers`.
- `persistence/` — scene state ↔ storage/URL (`scene-draft`, `scene-url`,
  `restore-flow`, `scene-reset`).
- `commands/` — the `EditorCommand` vocabulary and its dispatch binding.
- `types/` — shared core types.
- Root — the public, cross-layer surface: the engine port (`scene-commands`,
  `scene-services`, `scene.types`) and `dialog-contract`.

Dialog-store responsibilities

- Owns the generic active-surface dialog state and dialog-open selectors.
- Exposes registry-driven open/close APIs (`openDialog`, `setDialogOpen`, `closeActiveDialog`).
- Reads cross-store state only through app-configured `DialogRuntimeContext`.
- Does **not** write to scene or selection stores; cross-store writes belong in
  `operations/`, not the dialog store.

Should not contain

- UI components.
- Imports from `src/app` or `src/features`.

Guideline

- Put state transitions and cross-cutting operations here when they must stay
  consistent across features. Feature-internal orchestration stays in the
  owning feature.

See also

- `docs/architecture/architecture.md`
