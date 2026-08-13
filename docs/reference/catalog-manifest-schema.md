# Catalog Manifest Schema

The catalog manifest (`public/catalog-manifest.json`) defines the furniture
catalog that the room layout editor loads at startup. The exact contract is
the validator in `src/core/operations/catalog-manifest.ts`; this reference
summarizes the shape and its constraints, and the Example below shows a
complete manifest.

## Shape

The top level carries `version` (the number `1`), `collections`, `catalog`,
and `environment` (the three finish/mood lists below and their defaults).

### Collections

A collection pairs an `id` with a `modelPath` to a GLTF file. Catalog entries
reference collections by id.

### Catalog entries

A catalog entry describes one furniture item: `id`, display `name`, and
`kind` (one of `armchair`, `couch`, `coffee-table`, `end-table`). It names
the collection it loads from (`collectionId`) and the GLTF node to clone
(`nodeName`); an optional `uiBoundsNodeName` names a descendant node used as
the preferred bounds source for selected-item toolbar placement.
`footprintSize` gives the width/depth in meters used for collision, and
`previewPath` points at the catalog preview image.

### Floor finishes

A floor finish carries a `label`, an optional `previewPath`, and the
`diffusePath` and `normalPath` textures. `tileSizeMeters` states the physical
coverage of the texture; the runtime repeat is room size divided by tile size
per axis. For web delivery, prefer KTX2 textures (ETC1S diffuse, UASTC
normals). A finish without `previewPath` renders as a neutral placeholder
tile in the Room panel and stays selectable.

### Wall finishes

A wall finish carries a `label` and a `color`. The color also drives the Room
panel swatch.

### Lighting moods

A lighting mood retunes the existing room light rig - it adds no new lights.
The fields map directly onto the lights in
`src/scene/internal/environment/lighting.tsx`: `exposure` drives the renderer
tone-mapping exposure, and the color/intensity pairs feed the ambient,
hemisphere, key, fill, environment, and background contributions. The Room
panel swatch is derived from `keyLightColor` and `environmentColor`. The
panel and the 3D scene read the active mood from one shared resolver, so a
stored mood id that no longer exists falls back to the default mood (parallel
to floor/wall finishes).

### Defaults

`defaultFloorFinishId`, `defaultWallFinishId`, and `defaultLightingMoodId`
are optional and fall back to each list's first entry.

## Validation Rules

Enforced at load by `src/core/operations/catalog-manifest.ts`:

- `version` must be the number `1`.
- `collections`, `catalog`, and the three environment lists must be non-empty.
- Ids must be unique within each list (collections, catalog, floor finishes,
  wall finishes, lighting moods).
- All path fields (`modelPath`, `previewPath`, `diffusePath`, `normalPath`)
  must be relative paths that do not escape the public directory.
- `kind` must be a known furniture kind; `collectionId` must reference an
  existing collection; default environment ids must reference existing
  entries.
- Footprint and `tileSizeMeters` dimensions must be positive numbers; lighting
  mood `exposure` must be positive and its intensities non-negative, all
  finite.
- Wall and lighting mood colors must use `#RRGGBB` hex format.
- Wall finishes must not define `previewPath`; wall swatches are derived from
  `color`.
- If `uiBoundsNodeName` is present, it must be a non-empty string. Resolving
  it to a descendant of the entry's `nodeName` subtree is checked at model
  load by the scene's asset-node validation
  (`src/scene/internal/validate-catalog-asset-nodes.ts`; see Runtime
  Behavior).

## Runtime Behavior

- If the manifest fetch fails or times out, the app shows a startup error
  overlay and disables editor interactions until the user retries; there is no
  built-in fallback catalog.
- Manifest paths are resolved relative to the app's `import.meta.env.BASE_URL`.
- If `uiBoundsNodeName` is omitted, selected-item toolbar placement falls back
  to projected render bounds or object origin.
- If `uiBoundsNodeName` is present but the referenced node is missing from the
  loaded GLB subtree, the collection fails validation during its load (a hard
  asset contract error): a startup error when the collection gates startup, a
  permanently unavailable catalog item otherwise.
- `uiBoundsNodeName` affects toolbar bounds selection only; it is not an
  authored point anchor and it does not bypass overlap checks.
- How model-load failures surface depends on whether the collection gates
  startup (restored-scene assets -> error overlay) or is an on-demand catalog add
  (-> in-drawer message), and whether the failure is permanent or transient. The
  full model is in
  [startup-and-asset-loading.md](../architecture/startup-and-asset-loading.md).

## Example

```json
{
  "version": 1,
  "collections": [
    {
      "id": "leather",
      "modelPath": "models/leather-collection.glb"
    }
  ],
  "catalog": [
    {
      "id": "couch-1",
      "name": "Leather Couch",
      "kind": "couch",
      "collectionId": "leather",
      "nodeName": "CouchNode",
      "uiBoundsNodeName": "CouchToolbarBounds",
      "footprintSize": {
        "width": 2.5,
        "depth": 1.2
      },
      "previewPath": "catalog-previews/couch.webp"
    },
    {
      "id": "armchair-1",
      "name": "Leather Armchair",
      "kind": "armchair",
      "collectionId": "leather",
      "nodeName": "ArmchairNode",
      "uiBoundsNodeName": "ArmchairToolbarBounds",
      "footprintSize": {
        "width": 1.0,
        "depth": 1.0
      },
      "previewPath": "catalog-previews/armchair.webp"
    }
  ],
  "environment": {
    "floorFinishes": [
      {
        "id": "wood-floor",
        "label": "Wood",
        "previewPath": "environment/previews/wood-floor.webp",
        "diffusePath": "environment/textures/wood-floor_diff_2k.ktx2",
        "normalPath": "environment/textures/wood-floor_nor_gl_1k.ktx2",
        "tileSizeMeters": { "width": 2, "depth": 2 }
      }
    ],
    "wallFinishes": [
      {
        "id": "light-gray",
        "label": "Light Gray",
        "color": "#f5f5f5"
      }
    ],
    "lightingMoods": [
      {
        "id": "daylight",
        "label": "Daylight",
        "exposure": 1.05,
        "ambientIntensity": 0.35,
        "hemisphereSkyColor": "#f1f6ff",
        "hemisphereGroundColor": "#aeb9c9",
        "hemisphereIntensity": 0.55,
        "keyLightColor": "#fff4e6",
        "keyLightIntensity": 1.0,
        "fillLightColor": "#d5e4ff",
        "fillLightIntensity": 0.28,
        "environmentColor": "#dce6f3",
        "environmentIntensity": 0.72,
        "backgroundIntensity": 0.95
      }
    ],
    "defaultFloorFinishId": "wood-floor",
    "defaultWallFinishId": "light-gray",
    "defaultLightingMoodId": "daylight"
  }
}
```
