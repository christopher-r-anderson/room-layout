# scene

Purpose

- Own scene rendering, input mapping, and the viewport services (Three.js).

Structure

- `scene.tsx` - the layer's composition surface. It wires the GLTF sources and
  selection state into a set of concern hooks, registers their handlers as the
  imperative service surface, and renders the room/furniture/effects tree. It
  also holds the scene-side effects that keep the renderer and the document in
  step: the drag's live-present document write, camera re-framing on room-size
  change, renderer exposure, and preview gating. Catalog and finish options
  arrive as props from the app shell; other core state is read from stores.
- `internal/` - scene-private implementation, grouped by concern:
  - `furniture/` - the interactive mesh and the collection parse
    service/registry (document mutations live in `core/operations`).
  - `camera/` - controls, presets, camera operations, held-key motion.
  - `selection/` - selection render state (outline, object registry) and
    selected-toolbar geometry.
  - `drag/` - pointer drag state and drag math.
  - `snapshot/` - scene snapshot capture.
  - `environment/` - room, lighting, floor/wall materials.
  - `three/` - generic Three.js render helpers (meshes, bounds, textures) and the
    shared KTX2/Basis loader.
  - `validate-catalog-asset-nodes.ts` - asset-node contract validation.

Pattern

- Viewport services live in concern hooks (`use-camera-operations`,
  `use-scene-snapshot`) plus the collection parse loader `Scene` builds inline;
  `Scene` composes them and registers the handlers into core's port registry
  (`@/core/scene-services`). Pure placement/geometry math lives in `@/domain`.

Should not contain

- Imports from `src/app` or `src/features`.
- Model placement/collision math (that lives in `@/domain/geometry`).

Guideline

- Scene is the renderer adapter: it implements core's port
  (`@/core/scene-services`) and reads/writes core stores directly. Nothing
  imports `@/scene` except app's lazy mount of `@/scene/scene` - drive the
  engine through `@/core/scene-commands`.

See also

- `docs/architecture/architecture.md`
- `docs/architecture/scene-and-core.md`
