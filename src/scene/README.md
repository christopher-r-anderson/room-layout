# scene

Purpose

- Own scene rendering and the scene-domain engine (validity rules, Three.js).

Structure

- `scene.tsx` — composition + render only. It wires the GLTF sources and
  selection state into a set of concern hooks, registers their handlers as the
  imperative service surface, and renders the room/furniture/effects tree. It
  does not hold operation logic.
- `internal/` — scene-private implementation, grouped by concern:
  - `furniture/` — furniture mutation operations, the interactive mesh, and the
    collection parse service/registry.
  - `camera/` — controls, presets, camera operations, held-key motion.
  - `selection/` — selection state/operations and selected-toolbar geometry.
  - `history/` — undo/redo transitions and restore-history building.
  - `drag/` — pointer drag state and drag math.
  - `snapshot/` — scene snapshot capture.
  - `environment/` — room, lighting, floor/wall materials.
  - `three/` — generic Three.js render helpers (meshes, bounds, textures) and the
    shared KTX2/Basis loader.
  - `validate-catalog-asset-nodes.ts` — asset-node contract validation.

Pattern

- Imperative operations live in `use*Operations` hooks (history, camera,
  selection, furniture). Each takes the refs/state it needs and returns a stable
  API; `Scene` composes them and registers the handlers into core's port
  registry (`@/core/scene-services`). Pure placement/geometry math lives in
  `@/domain`, not here.

Should not contain

- Imports from `src/app` or `src/features`.
- Model placement/collision math (that lives in `@/domain/geometry`).

Guideline

- Scene is the renderer adapter: it implements core's port
  (`@/core/scene-services`) and reads/writes core stores directly. Nothing
  imports `@/scene` except app's lazy mount of `@/scene/scene` — drive the
  engine through `@/core/scene-commands`.

See also

- `docs/architecture/architecture.md`
- `docs/architecture/scene-and-core.md`
