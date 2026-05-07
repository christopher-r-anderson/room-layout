# Catalog Manifest Schema

The catalog manifest (`public/catalog-manifest.json`) defines the furniture catalog that the room layout editor loads at startup.

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
      "footprintSize": {
        "width": number,
        "depth": number
      },
      "previewPath": "string"
    }
  ]
}
```

## Fields

### Root Object

| Field         | Type   | Description                        |
| ------------- | ------ | ---------------------------------- |
| `version`     | number | Schema version (currently `1`)     |
| `collections` | array  | Array of GLTF model collections    |
| `catalog`     | array  | Array of furniture catalog entries |

### Collection Object

| Field       | Type   | Description                                                                    |
| ----------- | ------ | ------------------------------------------------------------------------------ |
| `id`        | string | Unique identifier for the collection (referenced by catalog entries)           |
| `modelPath` | string | Relative path to the GLTF model file (e.g., `"models/leather-collection.glb"`) |

### Catalog Entry Object

| Field                 | Type   | Description                                                                       |
| --------------------- | ------ | --------------------------------------------------------------------------------- |
| `id`                  | string | Unique identifier for the furniture item                                          |
| `name`                | string | Display name of the furniture piece                                               |
| `kind`                | string | Furniture kind; must be one of: `armchair`, `couch`, `coffee-table`, `end-table`  |
| `collectionId`        | string | Reference to a collection `id`; must exist in the collections array               |
| `nodeName`            | string | Name of the Three.js object node in the GLTF model to clone (e.g., `"ChairNode"`) |
| `footprintSize`       | object | Bounding dimensions for collision detection                                       |
| `footprintSize.width` | number | Width in meters (must be > 0)                                                     |
| `footprintSize.depth` | number | Depth in meters (must be > 0)                                                     |
| `previewPath`         | string | Relative path to a preview image                                                  |

## Validation Rules

- All `modelPath` and `previewPath` values must be **relative paths** that do not escape the public directory:
  - ✅ Allowed: `"models/foo.glb"`, `"catalog-previews/couch.webp"`
  - ❌ Not allowed: `"/models/foo.glb"`, `"http://example.com/foo.glb"`, `"//cdn.example.com/foo.glb"`, `"../models/foo.glb"`, `"%2e%2e/models/foo.glb"`, `"models\\foo.glb"`, `"models%2ffoo.glb"`
  - Paths are percent-decoded for validation and then canonicalized before runtime resolution
- All `kind` values must match one of the known furniture kinds
- All `collectionId` references must point to an existing collection
- All footprint dimensions must be positive numbers
- Both `collections` and `catalog` arrays must not be empty

## Runtime Behavior

- If the manifest fetch fails or times out, the app shows a startup error overlay and disables editor interactions until the user retries; there is no built-in fallback catalog
- Manifest paths are resolved relative to the app's `import.meta.env.BASE_URL`
- Failed asset preloads also trigger the startup error overlay; operators must ensure all paths in the manifest are valid and accessible

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
      "footprintSize": {
        "width": 1.0,
        "depth": 1.0
      },
      "previewPath": "catalog-previews/armchair.webp"
    }
  ]
}
```
