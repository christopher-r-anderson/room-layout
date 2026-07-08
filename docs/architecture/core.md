# Core

`src/core` is the headless editor: the editor state, the operations on it, and
the contracts other layers use. Features are the UI rendered over it; `app` only
composes. This doc is the layer reference - what lives here and who owns what.
For specifics, follow the pointers into the code.

Two concepts have their own docs:

- The scene/core seam (who owns furniture data vs. the rules that change it):
  [scene-and-core.md](scene-and-core.md).
- The dialog/overlay model: [dialogs-and-overlays.md](dialogs-and-overlays.md).

## Layout

- `stores/` - the state owners (below).
- `operations/` - cross-cutting operations over the stores.
- `persistence/` - the scene state <-> storage/URL codecs.
- `commands/` - the `EditorCommand` vocabulary and its dispatch binding.
- Root - the public, cross-layer contracts: the engine port surface
  (`scene-commands`, `scene-services`, `scene.types`) and `dialog-contract`.

## State scoping

Editor state is scoped by lifetime, and store names say which scope they hold:

- **Document** state is the persisted, undoable description of the room - what
  the share URL and the local draft serialize, and what undo/redo operates on.
  It lives in `scene-document-store`.
- **Session** state belongs to the current sitting: never serialized, never in
  the undo timeline. The scene session (`scene-session-store`) and the
  selection session (`selection-store`) are the session stores, reset wholesale
  on retry. The startup/asset stores are session-scoped machinery with their
  own retry semantics - a retry deliberately preserves e.g.
  `restoreAttemptCount`, which guards the one-time restore.
- **Ephemeral** values that nothing renders from stay out of stores entirely -
  module-level cells (the preview hysteresis timer, pending focus targets) or
  refs.

The rule of thumb: if losing a value on reload should not lose user work, it is
not document state; if no subscriber needs to react to it, it is not store
state.

## Store inventory

Each store is a Zustand `create()` bound hook over pure-data state. The bound
hook doubles as the imperative handle (`getState`/`subscribe`) for operations
and reconcilers; mutation goes through a module-level `xActions` object (the
default shape - registries and single-purpose wrappers like
`resetEditorLifecycleStore` export bare functions instead), and narrow selector
hooks (with `useShallow`
where a selector builds a fresh value) are the React read surface. Features
read the narrow hooks (or their non-reactive getter peers, e.g. `getItems`);
importing the generic bound hook from a feature is an ESLint error - its
`getState`/`subscribe` surface belongs to core operations and reconcilers.
"Written by" names the only modules that should mutate a store.

- **`scene-document-store`** - the scene **document**: furniture history (the
  undo/redo timeline), the instance-id counter, and the finish/mood ids - the
  persisted, undoable description of the room. Written by core operations,
  by scene (the drag's live-present writes), and by the room-surface feature
  (finish/mood picks). Ownership vs. the scene itself is the subject of
  [scene-and-core.md](scene-and-core.md).
- **`scene-session-store`** - the scene **session**: the raw hover-preview
  pointer (gated for reads by `usePreviewedId`), the live drag flag (written
  synchronously with the gesture; mutations and draft persistence guard on
  it), and the floor-finish loading indicator. Written by scene gestures and
  core preview actions.
- **`selection-store`** - the selection **session**: the selected item pointer,
  its provenance (`selectedSource`, read to decide post-delete focus), and the
  focus-intent tokens (outliner and room-view focus handoff). The pointer and
  its source are written atomically through `applySelection`
  (`operations/selection-mutations`), the one write path every mutation that
  moves the selection goes through. History mutations reconcile the pointer
  against restored items rather than undoing it. The pointer is written by
  core operations only; the focus-intent tokens are requested/cleared by the
  owning surfaces (selection and outliner features, app focus commands).
- **`editor-lifecycle-store`** - the single owner of the startup phase machine
  (`loading | ready | errored`), asset errors, restore outcome/attempt tracking,
  the `startupCycle` counter (bumped only on an explicit retry: the Scene
  remount key, the loader's stale-cycle guard, and the chunk-retry reload
  signal), and the reactive `sceneReady` flag (single
  producer: `scene-services` register/clear, so it always agrees with the
  imperative `isSceneReady()`). `isEditorInteractive()` is the non-React
  readiness predicate the preview gating/reconciler and the dialog-enablement
  gate read; scene-mutating operations gate on `isSceneReady()`. Written by the
  startup bootstrap, `startup-coordinator`, and `scene-services`.
- **`assets-store`** - the startup-loaded catalog manifest (catalog,
  collections, environment config). Lets features read catalog/finishes through
  narrow hooks instead of threaded props. Written by the startup bootstrap.
- **`collection-loading-store`** - the three-free collection loading lifecycle,
  keyed by sourcePath: the gated set, download progress, on-demand wants, and
  loaded/failed outcomes with failure classification (`unavailable` vs
  `connection`). The parsed scene roots live in `collection-scene-registry`
  (below); see
  [startup-and-asset-loading.md](startup-and-asset-loading.md). Written by the
  startup bootstrap and the collection load pipeline.
- **`toolbar-geometry-store`** - the selected item's projected toolbar geometry,
  a one-writer (scene raf loop) / one-reader (placement hook) data pipe kept
  apart from selection focus routing. Written by the scene's projection loop.
- **`toolbar-interaction-store`** - whether the user is engaging the selected
  item toolbar (pointer over, focus within, rotation grace window), read by the
  placement engine to pin the toolbar. Written by the selection feature's
  engagement reporting.
- **`dialog-store`** - generic active-surface dialog state, open/close
  operations, and dialog-open selectors. Model and invariants live in
  [dialogs-and-overlays.md](dialogs-and-overlays.md). Written by dialog actions.
- **`feedback` (`core/feedback/`)** - the user-feedback API and its surfaces:
  domain-typed entry points (`feedback.ts`) route each event class to toasts
  (module-singleton manager) or the SR-only announcement store (polite/
  assertive channels with a debounced movement variant). Call sites state the
  event class and never pick surfaces; the routing policy lives in
  [feedback.md](feedback.md). Written by operations and features.
- **`collection-scene-registry`** - the reactive registry of parsed
  furniture-collection scene roots, held opaquely (`unknown`) so core stays
  three-free, plus each node's authored transform as plain data
  (position/rotation defaults that let add/restore seed items without touching
  the scene graph). The scene layer registers and reads the parsed objects
  through its typed wrapper (`scene/internal/furniture/collection-scene-registry`).
  Written by the scene's parse service; reset by the core pipeline teardown
  (`resetCollectionPipeline`) so the loading lifecycle, registry, and byte
  cache reset together.

## Operations

Cross-cutting behavior that spans features is implemented as module-level
functions in `core/operations`. They read and write the stores above and call
`sceneCommands`, and the UI imports them directly
(buttons, command dispatch, scene callbacks). This is the home that makes the
cross-feature import ban possible - features coordinate by calling a shared
operation, never by importing a sibling feature.

Standing reconcilers - store subscriptions that coordinate derived writes
across stores - are built with `createReconciler` (which owns the idempotency
guard and cleanup fan-in) and started together from `startEditorReconcilers`
at app startup: outliner focus, preview hygiene, collection loading, and draft
persistence.

- `history-actions`, `movement-actions`, `selection-actions` - undo/redo,
  move/rotate, selection; gated on startup readiness. They call the document
  mutations in `furniture-mutations`/`history-mutations`/`selection-mutations`,
  which validate via `@/domain/geometry` and write the store (see
  [scene-and-core.md](scene-and-core.md)).
- `preview-actions` + `preview-reconciler` - preview hysteresis as module
  cells plus the reconciler that clears preview state whenever a suppressing
  gate (drag, blocking overlay, not-ready) holds or the previewed item leaves
  the document.
- `previewed-id`, `history-availability`, `selected-furniture` - cross-store
  derived reads as value modules: the gated visible preview, undo/redo
  availability dampened by the drag flag, and the selected item joined with the
  document.
- `draft-persistence` - mirrors the scene document into the localStorage draft
  while the editor is ready and not dragging, reading the environment config
  from `assets-store` at persist time.
- `startup-coordinator` - `completeAssetLoad` (one-time restore + mark ready),
  `notifyAssetError`, `requestAssetRetry`. Sources catalog/finishes from
  `assets-store`, drives `editor-lifecycle-store`.
- `startup-bootstrap` - the manifest fetch pipeline (`runStartupBootstrap`):
  fetch and validate into `assets-store`, resolve the gated set, begin the
  asset load. Invoked at app mount (via the thin `use-startup-bootstrap` hook)
  and by `requestAssetRetry`; latest wins, a superseded or cancelled run
  writes nothing.
- `restore-flow`, `scene-reset`, `referenced-collections` - the flows that
  orchestrate the persistence codecs: startup restore source selection and
  application, reset-to-defaults, and the bootstrap's gated-set resolution.
- `selection-actions` + `selection-mutations` - the selection surface. The
  mutation writes the pointer + provenance atomically (and drops the hover
  preview on change); the action layers on the readiness guard and the
  screen-reader announcement (`announceSelectionChange`), synchronous with the
  write.

Feature-internal orchestration (e.g. `features/selection/deletion-actions`,
`features/catalog/catalog-actions`) stays in the owning feature and imports core
operations rather than sibling features.

## Commands

`core/commands` defines the typed `EditorCommand` union and the dispatch binding:
`EditorCommandHandlers` (a handler-per-`kind` mapped type), `runEditorCommand` (a
map lookup, not a switch), and the ref-backed dispatch context
(`useCommandDispatch`). Adding a command is two type-enforced edits - a union
member and a handler key.

A command is a **declarative editor intent triggerable by the keyboard table or a
toolbar button**. Its implementation lives with its owning concern - a core
operation or feature action - and the command layer only wires `kind -> impl`
(assembled in `app/commands/use-editor-command-handlers.ts`); App invents no
command semantics. Dispatch a command for that keyboard/toolbar vocabulary; call
operations or `sceneCommands` directly for intra-feature or intra-component logic.

The React dispatch binding lives in `core` (not `app` or `shared`) on purpose: it
imports the command vocabulary yet must be importable by feature buttons, and the
boundary rules forbid features importing `app` and forbid `shared` importing
`core` - so `core` is the only valid home. `core` already contains React anyway
(store selector hooks), so this is consistent, not an exception.

## Persistence

`core/persistence` holds the codecs that serialize the `scene-document-store`
data model: `scene-draft` (localStorage autosave), `scene-url` (shareable URL
codec), and `furniture-serialization`. The flows that orchestrate them live in
`core/operations` (see the operations inventory above).

## Boundaries

`core` must not import `app`, `features`, or `@/scene`, and must not contain UI
components (enforced in `eslint.config.js`; see
[architecture.md](architecture.md)). Within `core`, the `dialog-store`
additionally must not write to other stores - see
[dialogs-and-overlays.md](dialogs-and-overlays.md). Cross-store writes belong in
`operations`.
