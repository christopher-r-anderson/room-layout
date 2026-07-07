# core

Purpose

- Own the headless editor core: cross-feature stores, operations, and contracts.

Layout

- `stores/` - the zustand stores: `create()` bound hooks over pure-data state,
  mutated through a module-level `xActions` surface (or bare functions for
  registries/single-purpose wrappers) and read through narrow selector
  hooks. Covers the scene document and session (`scene-document-store`,
  `scene-session-store`), the catalog/environment manifest (`assets-store`),
  and the startup/asset-loading state (`editor-lifecycle-store`,
  `collection-loading-store`).
- `operations/` - cross-cutting operations over the stores (history/movement/
  selection actions, `startup-coordinator`, the collection load pipeline
  (`collection-loader`, `collection-bytes`), preview actions + reconciler,
  `selection-actions`/`selection-mutations`, `draft-persistence`). These
  orchestrate writes across
  stores and scene commands for behavior that spans features; standing
  reconcilers are built with `createReconciler` and started from
  `startEditorReconcilers`.
- `persistence/` - the scene state <-> storage/URL codecs (`scene-draft`,
  `scene-url`, `furniture-serialization`). Orchestration flows over them
  (`restore-flow`, `scene-reset`, `referenced-collections`) live in
  `operations/`.
- `commands/` - the `EditorCommand` vocabulary and its dispatch binding.
- Root - the public, cross-layer surface: the engine port (`scene-commands`,
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
