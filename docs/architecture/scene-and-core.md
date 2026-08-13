# Scene and Core

This is the most load-bearing seam in the codebase and the easiest to
misunderstand. It governs how the imperative Three.js/React-Three-Fiber scene and
the declarative React UI share furniture state.

## The split

- **`core` owns the document and its mutations.** `scene-document-store.history`
  holds the authoritative `FurnitureItem[]` - positions, rotations, ids. That is
  what the undo/redo timeline operates on and what gets serialized to the share
  URL and the local draft. Mutations (add, move, rotate, transform, delete,
  undo/redo, restore, select) are core operations
  (`core/operations/furniture-mutations`, `history-mutations`,
  `selection-mutations`) that validate against the rules and write the store;
  the drag is the one scene-composed case, pairing core's pure resolvers with
  the store's history action (see Drag below).
- **`domain` owns the rules.** Collision, bounds, edge-snap, spawn placement,
  and the room-size model (defaults, limits, size -> bounds derivation) are
  pure geometry in `@/domain/geometry`, called synchronously by the core
  mutations. No renderer, no store, no React.
- **`scene` renders and maps input.** The r3f component tree is a projection of
  the document; pointer gestures are mapped to world-space intents (rays ->
  positions) and fed to the same rules and store; the camera, screen-space
  projections, and GLB parsing are the viewport services core reaches through
  the engine port.

## The channels

```text
UI intent ──► core operation (validates via @/domain/geometry rules)
                       │
          scene-document-store  ──►  React selectors  ──►  UI re-renders
                       │
              scene renders the document (Object3D transforms are a projection)
```

- **Mutations are core-internal.** A keyboard move stays in core: the operation
  checks scene readiness through the port, reads the store, runs the pure
  resolution, writes the store. The scene re-renders from the result.
- **Input maps down to the same path.** A pointer drag uses the viewport for
  exactly one thing - turning the pointer ray into a floor position - then runs
  the same domain rules and writes the same store (see Drag below).
- **The engine port is viewport-only.** `sceneCommands`
  (`src/core/scene-commands.ts`, backed by the `SceneServices` registry in
  `src/core/scene-services.ts` that the Scene registers into on mount) carries
  camera control, the screen-space snapshot, and the GL-bound collection parse.
  Document mutations do not pass through it.
- **Node defaults are data.** When the scene registers a parsed collection it
  extracts each node's authored transform into plain data
  (`collection-scene-registry`), so add/restore seed new items without touching
  the scene graph.

## Drag

The drag gesture is scene-owned (it needs the pointer ray each move), but the
document stays authoritative throughout: each move writes the validated position
into the history's live present (coalesced, no undo entry per move), and the
drop finalizes one undo step. The session store's `isDragging` flag is written
synchronously with the gesture, so core mutations that guard on it never race a
render. Object3D transforms are never read back as a source of truth.

## Who owns what

| Concern                                       | Authority                                                   |
| --------------------------------------------- | ----------------------------------------------------------- |
| Committed furniture data (undo, serialize)    | `core` (`scene-document-store.history`)                     |
| Validity rules (collision, bounds, placement) | `domain` (`@/domain/geometry`)                              |
| Document mutations (incl. during drag)        | `core` mutation modules (the drag composes them scene-side) |
| Rendering / camera / screen projection        | `scene`                                                     |
| Selection/preview/finish UI state             | `core` stores                                               |

## Invariants / guardrails

- The rules live once, in `@/domain/geometry`, called by core mutations. Scene
  code must not fork placement/collision math, and core must not bypass the
  rules when writing furniture state.
- Scene writes state only through the sanctioned channels: the drag
  live-present path writes the document, canvas-pointer selection calls the
  core selection action, the gesture writes the session drag flag, the room's
  texture-load callback writes the floor-loading indicator, the throttled
  projection loop writes toolbar geometry, the mount lifecycle registers the
  scene services (which raises `sceneReady`), and the parse service registers
  parsed collections. Each is named in core.md's store inventory; anything
  else is a core operation.
- The engine port (`SceneServices`) is deliberately small. Widening it is a
  deliberate act: a new method means core is delegating another decision to the
  renderer adapter.
- On restore/retry, the scene is rebuilt from the `core` data model
  (`restoreInitialLayout`) - the document is the system of record; the scene is
  pixels.

## Pointers

- Document mutations: `src/core/operations/{furniture,history,selection}-mutations.ts`
- Pure resolvers: `src/core/operations/furniture-operations.ts`, rules in `src/domain/geometry/`
- Command surface: `src/core/scene-commands.ts`
- Port registry: `src/core/scene-services.ts`
- Registration site: `src/scene/scene.tsx`
- The document: `src/core/stores/scene-document-store.ts`; the session:
  `src/core/stores/scene-session-store.ts`
