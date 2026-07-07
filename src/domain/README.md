# domain

The model vocabulary and pure logic over it — the lowest layer. Every other layer
imports `domain` downward; `domain` imports nothing internal (only external libs
like `three` for math types).

- `furniture.ts` — the furniture model types (`FurnitureItem`, `FurnitureInstance`,
  `FootprintSize`, `FurnitureKind`).
- `catalog.ts` — catalog manifest types (`FurnitureCatalogEntry`,
  `FurnitureCollection`) and the pure `getCollection` lookup.
- `environment-materials.ts` — room finish vocabulary (`FloorFinishOption`,
  `WallFinishOption`, `EnvironmentMaterialConfig`) and pure finish lookups.
- `scene-model.ts` / `scene-defaults.ts` — the comparable scene-state shape,
  default-scene construction, and the at-defaults comparison.
- `geometry/` — pure placement/geometry functions over the model (footprint,
  layout, spawn, wall clearance, room metrics), shared by scene and features.

Keep this layer free of React, stores, rendering, persistence, and any `@/`
import outside `domain`. If something needs scene, shared, or core, it does not
belong here.
