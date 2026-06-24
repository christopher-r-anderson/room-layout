# scene

Purpose

- Own scene rendering and the scene-domain engine (validity rules, Three.js).

Structure

- `scene.tsx` — composition + render only. It wires the GLTF sources and
  selection state into a set of concern hooks, registers their handlers as the
  imperative service surface, and renders the room/furniture/effects tree. It
  does not hold operation logic.
- `scene-commands.ts` / `scene.types.ts` — the down-contract (imperative surface
  app/core call) and its types.
- `internal/` — scene-private implementation, grouped by concern:
  - `furniture/` — furniture mutation operations and the interactive mesh.
  - `camera/` — controls, presets, camera operations, held-key motion.
  - `selection/` — selection state/operations and selected-toolbar geometry.
  - `history/` — undo/redo transitions and restore-history building.
  - `drag/` — pointer drag state and drag math.
  - `snapshot/` — scene snapshot capture.
  - `environment/` — room, lighting, floor/wall materials.
  - `three/` — generic Three.js render helpers (meshes, bounds, textures).
  - `scene-services.ts`, `validate-catalog-asset-nodes.ts` — cross-concern
    infrastructure (the service registry and asset-node validation).

Pattern

- Imperative operations live in `use*Operations` hooks (history, camera,
  selection, furniture). Each takes the refs/state it needs and returns a stable
  API; `Scene` composes them and registers the handlers via `scene-services`.
  Pure placement/geometry math lives in `@/domain`, not here.

Should not contain

- Imports from `src/app` or `src/features`.
- Direct usage of core modules outside approved scene contracts.
- Model placement/collision math (that lives in `@/domain/geometry`).

Guideline

- Treat scene internals as private implementation details; reach scene from
  other layers only through the approved contract modules.

See also

- `docs/architecture/architecture.md`
- `docs/architecture/scene-and-core.md`
