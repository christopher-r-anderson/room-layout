# Scene and Core

This is the most load-bearing seam in the codebase and the easiest to
misunderstand. It governs how the imperative Three.js/React-Three-Fiber scene and
the declarative React UI share furniture state.

## The split (it is not a "mirror")

It is tempting to say "scene mutates, core mirrors." That is misleading. The real
division is:

- **`core` owns the data model.** `scene-state-store.history` holds the
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
  the `scene-state-store` data model.
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
   sceneStateActions.setHistory(...)  (up: commit the validated result)
                       │
              scene-state-store  ──►  React selectors  ──►  UI re-renders
```

- **Down — commands.** `sceneCommands` (`src/scene/scene-commands.ts`) is the
  imperative surface, backed by per-component service registration in
  `src/scene/internal/scene-services.ts`. App/core code calls it to drive
  mutations that depend on Three.js refs and in-component closures.
- **Up — the published contract.** Scene writes committed results back into the
  store through `src/core/scene-contracts.ts` — a deliberately tiny allowlist
  (e.g. `sceneStateActions`, `selectionMetaActions`). Scene may import **only**
  that module from `core`; everything else is banned in `eslint.config.js`.

## Who owns what

| Concern                                       | Authority                                  |
| --------------------------------------------- | ------------------------------------------ |
| Committed furniture data (undo, serialize)    | `core` (`scene-state-store.history`)       |
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
  positions in `scene-state-store` is not license to do placement/collision math
  there; that logic stays in `scene`, in one place.
- A mutation is: call a command → scene validates and applies → scene publishes
  the committed result up. The UI never writes the data model directly for
  scene-owned mutations.
- Scene reaches `core` only through `scene-contracts`. Widening that surface is a
  deliberate act (update the module and its ESLint allowlist together).
- On restore/retry, scene is rebuilt from the `core` data model
  (`restoreInitialLayout`) — confirming `core` is the system of record for the
  data, `scene` for the rules and pixels.

## Pointers

- Command surface: `src/scene/scene-commands.ts`
- Service registration: `src/scene/internal/scene-services.ts`
- Published contract: `src/core/scene-contracts.ts`
- The data model: `src/core/stores/scene-state-store.ts`
