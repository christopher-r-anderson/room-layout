# Core

`src/core` is the headless editor: the editor state, the operations on it, and
the contracts other layers use. Features are the UI rendered over it; `app` only
composes. This doc is the layer reference - what lives here and who owns what.
For specifics, follow the pointers into the code.

Several concepts have their own docs:

- The scene/core seam (who owns furniture data vs. the rules that change it):
  [scene-and-core.md](scene-and-core.md).
- The dialog/overlay model (`dialog-store`):
  [dialogs-and-overlays.md](dialogs-and-overlays.md).
- Focus routing (`focus-store`): [focus.md](focus.md).
- Feedback routing (`feedback-store`): [feedback.md](feedback.md).
- Startup, asset loading, and the collection pipeline
  (`editor-lifecycle-store`, `assets-store`, `collection-loading-store`,
  `collection-scene-registry`):
  [startup-and-asset-loading.md](startup-and-asset-loading.md).
- Selected-toolbar placement (`toolbar-geometry-store`,
  `toolbar-interaction-store`):
  [selected-toolbar-placement.md](selected-toolbar-placement.md).

## Layout

- `stores/` - the state owners (below).
- `operations/` - cross-cutting operations over the stores.
- `persistence/` - the scene state <-> storage/URL codecs.
- `commands/` - the `EditorCommand` vocabulary and its dispatch binding.
- `layout/` - the `EditorRectId` rect vocabulary with its registration and
  measurement contexts, plus the `useSurfaceFocusClaim` surface handles.
- Root - the public, cross-layer contracts: the engine port surface
  (`scene-commands`, `scene-services`, `scene.types`) and `dialog-contract`.

## State scoping

Editor state is scoped by lifetime, and store names say which scope they hold:

- **Document** state is the persisted, undoable description of the room - what
  the share URL and the local draft serialize, and what undo/redo operates on.
  It lives in `scene-document-store`: the furniture history, the instance-id
  counter, the finish/mood ids, and the room size.
- **Session** state belongs to the current sitting: never serialized, never in
  the undo timeline. The scene session (`scene-session-store`) and the
  selection session (`selection-store`) are the session stores, reset wholesale
  on retry. The startup/asset stores are session-scoped machinery with their
  own retry semantics - a retry resets restore tracking (the error path wiped
  the document, so restore re-runs at ready) and preserves `sceneReady`, which
  mirrors the scene-services registration.
- **Ephemeral** values that nothing renders from stay out of stores entirely -
  module-level cells (the preview hysteresis timer, the pending delete origin) or
  refs.

A value whose loss on reload would not lose user work is not document state. A
value no subscriber needs to react to is not store state.

## Stores

Each store is a Zustand `create()` bound hook over pure-data state. The bound
hook doubles as the imperative handle (`getState`/`subscribe`) for operations
and reconcilers. Mutation goes through a module-level `xActions` object;
registries and single-purpose wrappers like `resetEditorLifecycleStore` export
bare functions instead. Narrow selector hooks (with `useShallow` where a
selector builds a fresh value) are the React read surface: features read those
hooks or their non-reactive getter peers (e.g. `getItems`), and importing the
generic bound hook from a feature is an ESLint error - its
`getState`/`subscribe` surface belongs to core operations and reconcilers.

Each store has a small set of sanctioned writers; anything else mutates through
an operation. The selection pointer has one write path - `applySelection` in
`operations/selection-mutations` - that every mutation moving the selection
goes through. The store modules in `core/stores/` are the inventory; the
concept docs above carry the models for focus, dialogs, feedback,
startup/collections, and toolbar placement.

## Operations

Cross-cutting behavior that spans features is implemented as module-level
functions in `core/operations`. They read and write the stores and call
`sceneCommands`, and the UI imports them directly (buttons, command dispatch,
scene callbacks). Features coordinate by calling a shared operation, never by
importing a sibling feature.

Standing reconcilers - store subscriptions that coordinate derived writes
across stores - are built with `createReconciler` (which owns the idempotency
guard and cleanup fan-in) and started together from `startEditorReconcilers`
at app startup: pending focus, preview hygiene, collection loading, and draft
persistence.

The modules in `core/operations/` are the inventory. The broad groups:
user-facing actions (history, movement, selection, preview, view, canvas
keyboard) that layer readiness guards and screen-reader announcements over the
pure document mutations, which validate via `@/domain/geometry` and write the
store; the startup pipeline and restore flows; cross-store derived reads as
value modules; and draft persistence.

Feature-internal orchestration (e.g. `features/selection/deletion-actions`,
`features/catalog/catalog-actions`) stays in the owning feature and imports core
operations rather than sibling features.

## Commands

`core/commands` defines the typed `EditorCommand` union and the dispatch binding:
`EditorCommandHandlers` (a handler-per-`kind` mapped type), `runEditorCommand` (a
map lookup), and the dispatch context (`useCommandDispatch`). Adding a command
is two type-enforced edits - a union member and a handler key.

A command is a **declarative editor intent triggerable by the keyboard table or a
toolbar button**. Its implementation lives with its owning concern - a core
operation or feature action - and the command layer only wires `kind -> impl`
(assembled in `app/commands/editor-command-handlers.ts`); App invents no
command semantics. Dispatch a command for that keyboard/toolbar vocabulary; call
operations or `sceneCommands` directly for intra-feature or intra-component logic.

The React dispatch binding lives in `core` (not `app` or `shared`) on purpose: it
imports the command vocabulary yet must be importable by feature buttons, and the
boundary rules forbid features importing `app` and forbid `shared` importing
`core` - so `core` is the only valid home. `core` already contains React
(store selector hooks).

## Persistence

`core/persistence` holds the codecs that serialize the `scene-document-store`
data model: `scene-payload` (the payload fields, normalization, and validation
shared by every envelope), `scene-draft` (localStorage autosave), and
`scene-url` (shareable URL codec). The flows that orchestrate them live in
`core/operations`. localStorage keys are namespaced per deployment via the
storage instance segment (`docs/architecture/configuration.md`). The draft is a
single last-write-wins record shared by all tabs; there is no cross-tab
synchronization.

## Boundaries

`core` must not import `app`, `features`, or `@/scene`, and must not contain UI
components (enforced in `eslint.config.js`; see
[architecture.md](architecture.md)). Within `core`, the `dialog-store`
additionally must not write to other stores - see
[dialogs-and-overlays.md](dialogs-and-overlays.md). Cross-store writes belong in
`operations`.
