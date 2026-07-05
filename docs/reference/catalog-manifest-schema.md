# Catalog Manifest Schema

The catalog manifest (`public/catalog-manifest.json`) defines the furniture
catalog that the room layout editor loads at startup.

## Format

The manifest is a JSON file with the following structure:

```json
{
  "version": 1,
  "collections": [
    {
      "id": "string",
      "modelPath": "string"
    }
  ],
  "catalog": [
    {
      "id": "string",
      "name": "string",
      "kind": "string",
      "collectionId": "string",
      "nodeName": "string",
      "uiBoundsNodeName": "string",
      "footprintSize": {
        "width": number,
        "depth": number
      },
      "previewPath": "string"
    }
  ],
  "environment": {
    "floorFinishes": [
      {
        "id": "string",
        "label": "string",
        "previewPath": "string",
        "diffusePath": "string",
        "normalPath": "string",
        "tileSizeMeters": {
          "width": number,
          "depth": number
        }
      }
    ],
    "wallFinishes": [
      {
        "id": "string",
        "label": "string",
        "color": "#RRGGBB"
      }
    ],
    "lightingMoods": [
      {
        "id": "string",
        "label": "string",
        "exposure": number,
        "ambientIntensity": number,
        "hemisphereSkyColor": "#RRGGBB",
        "hemisphereGroundColor": "#RRGGBB",
        "hemisphereIntensity": number,
        "keyLightColor": "#RRGGBB",
        "keyLightIntensity": number,
        "fillLightColor": "#RRGGBB",
        "fillLightIntensity": number,
        "environmentColor": "#RRGGBB",
        "environmentIntensity": number,
        "backgroundIntensity": number
      }
    ],
    "defaultFloorFinishId": "string",
    "defaultWallFinishId": "string",
    "defaultLightingMoodId": "string"
  }
}
```

## Fields

### Root Object

| Field         | Type   | Description                              |
| ------------- | ------ | ---------------------------------------- |
| `version`     | number | Schema version (currently `1`)           |
| `collections` | array  | Array of GLTF model collections          |
| `catalog`     | array  | Array of furniture catalog entries       |
| `environment` | object | Floor/wall material options and defaults |

### Collection Object

| Field       | Type   | Description                                                                          |
| ----------- | ------ | ------------------------------------------------------------------------------------ |
| `id`        | string | Unique identifier for the collection (referenced by catalog entries)                 |
| `modelPath` | string | Relative path to the GLTF model file (for example `"models/leather-collection.glb"`) |

### Catalog Entry Object

- `id` (`string`): Unique identifier for the furniture item
- `name` (`string`): Display name of the furniture piece
- `kind` (`string`): Furniture kind; must be one of `armchair`, `couch`,
  `coffee-table`, `end-table`
- `collectionId` (`string`): Reference to a collection `id`; must exist in the
  collections array
- `nodeName` (`string`): Name of the Three.js object node in the GLTF model to
  clone (for example `"ChairNode"`)
- `uiBoundsNodeName` (`string`, optional): Descendant node under `nodeName`
  used as the preferred bounds source for selected-item toolbar placement
- `footprintSize` (`object`): Bounding dimensions for collision detection
- `footprintSize.width` (`number`): Width in meters (must be `> 0`)
- `footprintSize.depth` (`number`): Depth in meters (must be `> 0`)
- `previewPath` (`string`): Relative path to a preview image

### Environment Object

| Field                   | Type   | Description                                                                                       |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `floorFinishes`         | array  | Available floor texture options                                                                   |
| `wallFinishes`          | array  | Available wall color options; swatches are derived from `color`                                   |
| `lightingMoods`         | array  | Available lighting mood presets; each retunes the room light rig                                  |
| `defaultFloorFinishId`  | string | Default floor finish id; must reference `floorFinishes[].id` (optional, defaults to first entry)  |
| `defaultWallFinishId`   | string | Default wall finish id; must reference `wallFinishes[].id` (optional, defaults to first entry)    |
| `defaultLightingMoodId` | string | Default lighting mood id; must reference `lightingMoods[].id` (optional, defaults to first entry) |

### Floor Finish Object

| Field                  | Type   | Description                                    |
| ---------------------- | ------ | ---------------------------------------------- |
| `id`                   | string | Unique floor finish id                         |
| `label`                | string | Display label in the editor                    |
| `previewPath`          | string | Optional relative path to a preview image      |
| `diffusePath`          | string | Relative path to diffuse/albedo texture        |
| `normalPath`           | string | Relative path to normal texture                |
| `tileSizeMeters`       | object | Physical texture coverage in meters (required) |
| `tileSizeMeters.width` | number | Covered width in meters (> 0)                  |
| `tileSizeMeters.depth` | number | Covered depth in meters (> 0)                  |

Floor texture repeat is computed at runtime from room dimensions:

- `repeat.x = roomWidthMeters / tileSizeMeters.width`
- `repeat.y = roomDepthMeters / tileSizeMeters.depth`

For web delivery, prefer KTX2 textures for floor finishes:

- Diffuse/albedo maps: ETC1S (`*_diff_2k.ktx2`)
- Normal maps: UASTC (`*_nor_gl_1k.ktx2`)

If `previewPath` is omitted for a floor finish, the Room panel renders that
option with a neutral placeholder tile instead of an image thumbnail. The finish
remains selectable.

### Wall Finish Object

| Field   | Type   | Description                                                               |
| ------- | ------ | ------------------------------------------------------------------------- |
| `id`    | string | Unique wall finish id                                                     |
| `label` | string | Display label in the editor                                               |
| `color` | string | Hex color string in `#RRGGBB` format; also used for the Room panel swatch |

### Lighting Mood Object

A lighting mood retunes the existing room light rig — it adds no new lights. The
mood values map directly onto the lights in
`src/scene/internal/environment/lighting.tsx`. Color fields are `#RRGGBB` hex
strings; intensity fields are non-negative numbers; `exposure` drives the
renderer tone-mapping exposure and must be `> 0`.

| Field                   | Type   | Description                                          |
| ----------------------- | ------ | ---------------------------------------------------- |
| `id`                    | string | Unique lighting mood id                              |
| `label`                 | string | Display label in the editor                          |
| `exposure`              | number | Renderer tone-mapping exposure (`> 0`)               |
| `ambientIntensity`      | number | Ambient light intensity (`>= 0`)                     |
| `hemisphereSkyColor`    | string | Hemisphere sky color (`#RRGGBB`)                     |
| `hemisphereGroundColor` | string | Hemisphere ground color (`#RRGGBB`)                  |
| `hemisphereIntensity`   | number | Hemisphere light intensity (`>= 0`)                  |
| `keyLightColor`         | string | Key (shadow-casting) directional light color         |
| `keyLightIntensity`     | number | Key directional light intensity (`>= 0`)             |
| `fillLightColor`        | string | Fill directional light color (`#RRGGBB`)             |
| `fillLightIntensity`    | number | Fill directional light intensity (`>= 0`)            |
| `environmentColor`      | string | Background/environment tint color (`#RRGGBB`)        |
| `environmentIntensity`  | number | Environment lighting contribution intensity (`>= 0`) |
| `backgroundIntensity`   | number | Background brightness intensity (`>= 0`)             |

The Room panel swatch for each mood is derived from `keyLightColor` and
`environmentColor`. The Room panel and the 3D scene read the active mood from one
shared resolver, so a stored mood id that no longer exists falls back to the
default mood (parallel to floor/wall finishes).

## Validation Rules

These are enforced at load by the validator in
`src/features/startup/catalog-manifest.ts`, which is the exact contract; the list
below is the human-readable summary.

- All path fields (`modelPath`, catalog/floor `previewPath`, `diffusePath`,
  `normalPath`) must be relative paths that do not escape the public directory.
- All `kind` values must match one of the known furniture kinds.
- All `collectionId` references must point to an existing collection.
- If `uiBoundsNodeName` is present, it must be a non-empty string and must
  resolve to a descendant node inside the catalog entry's `nodeName` subtree at
  runtime.
- All footprint dimensions must be positive numbers.
- Wall colors and lighting mood colors must use `#RRGGBB` hex format.
- Wall finishes must not define `previewPath`; wall swatches are derived from
  `color`.
- Lighting mood `exposure` must be a positive finite number; all other lighting
  mood intensities must be non-negative finite numbers.
- Default environment ids must reference existing floor/wall finish or lighting
  mood ids.
- Both `collections` and `catalog` arrays must not be empty.
- The `environment.floorFinishes`, `environment.wallFinishes`, and
  `environment.lightingMoods` arrays must not be empty.

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
  startup (restored-scene assets → error overlay) or is an on-demand catalog add
  (→ in-drawer message), and whether the failure is permanent or transient. The
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
