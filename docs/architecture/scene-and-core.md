# Scene and Core

This is the most load-bearing seam in the codebase and the easiest to
misunderstand. It governs how the imperative Three.js/React-Three-Fiber scene and
the declarative React UI share furniture state.

## The split (it is not a "mirror")

It is tempting to say "scene mutates, core mirrors." That is misleading. The real
division is:

- **`core` owns the data model.** `scene-document-store.history` holds the
  authoritative `FurnitureItem[]` — positions, rotations, ids. That is what the
  undo/redo timeline operates on and what gets serialized to the share URL and
  the local draft. It is plain, serializable, reactive state.
- **`scene` owns the rules and the rendering.** Collision, bounds, placement,
  camera, and the live Three.js objects live in `src/scene` (and
  `src/scene/internal`). Scene is the authority on what a change is _allowed_ to
  be.

So `core` is a **model**; `scene` is a **validation/rendering engine attached to
that model**. Neither is a passive reflection of the other.

## Why it is shaped this way

- React cannot reactively subscribe to Three.js object transforms, so the UI
  (inspector, outliner, toolbar) needs a React-readable copy of the data. That is
  the `scene-document-store` data model.
- The UI must not be able to write _invalid_ state (overlapping furniture,
  out-of-bounds positions). So mutations cannot go straight to the store — they
  must pass through the engine that knows the rules.

This is the standard pattern for bridging React to any imperative engine (a map
SDK, a code editor, a game loop): a read model for the UI, a validated command
path for changes.

## The two channels

```text
UI intent ──► sceneCommands.moveSelection()  (down: ask scene to validate+apply)
                       │
              scene applies rules (collision, bounds), updates Three.js objects
                       │
   sceneDocumentActions.setHistory(...)  (up: commit the validated result)
                       │
              scene-document-store  ──►  React selectors  ──►  UI re-renders
```

- **Down — commands.** `sceneCommands` (`src/core/scene-commands.ts`) is the
  imperative surface, backed by the port registry in `src/core/scene-services.ts`
  that the Scene component registers its services into on mount. Core owns the
  port interfaces; scene implements them. App/core code calls the commands to
  drive mutations that depend on Three.js refs and in-component closures.
- **Up — direct store writes.** Scene writes committed results into the core
  stores directly (`sceneDocumentActions`, `toolbarGeometryActions`) — the
  source dependency points one way, scene → core, enforced in
  `eslint.config.js`: nothing outside `src/scene` may import it except app's
  single mount of `@/scene/scene`.

## Who owns what

| Concern                                       | Authority                                  |
| --------------------------------------------- | ------------------------------------------ |
| Committed furniture data (undo, serialize)    | `core` (`scene-document-store.history`)    |
| Validity rules (collision, bounds, placement) | `scene`                                    |
| The live transform _during_ a drag            | `scene` (Three.js object), until committed |
| Rendering / camera                            | `scene`                                    |
| Selection/preview/finish UI state             | `core` stores                              |

The subtlety newcomers trip on: **during an interaction the authority is split in
time.** Mid-drag, the live position is in the Three.js object; the store holds the
last committed value and updates when scene publishes. "Who owns position"
therefore depends on the field and the moment — committed data in `core`, live
and valid-state in `scene`.

## Invariants / guardrails

- Do **not** reimplement scene rules against the store in `core`. Seeing
  positions in `scene-document-store` is not license to do placement/collision math
  there; that logic stays in `scene`, in one place.
- A mutation is: call a command → scene validates and applies → scene publishes
  the committed result up. The UI never writes the data model directly for
  scene-owned mutations.
- The engine port (`SceneServices`) is deliberately small. Widening it is a
  deliberate act: a new method means core is delegating another decision to the
  renderer adapter.
- On restore/retry, scene is rebuilt from the `core` data model
  (`restoreInitialLayout`) — confirming `core` is the system of record for the
  data, `scene` for the rules and pixels.

## Pointers

- Command surface: `src/core/scene-commands.ts`
- Port registry: `src/core/scene-services.ts`
- Registration site: `src/scene/scene.tsx`
- The data model: `src/core/stores/scene-document-store.ts`
