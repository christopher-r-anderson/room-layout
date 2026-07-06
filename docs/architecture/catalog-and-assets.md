# Catalog and Assets

This guide covers contributor maintenance of the runtime catalog and related
asset pipeline details.

## Catalog Manifest

The runtime catalog source of truth is `public/catalog-manifest.json`.

To add or update furniture/environment options:

1. Update manifest collections and entries.
2. Add referenced assets under `public/`.
3. Validate node names, IDs, and relative paths.

## Asset Locations

Runtime (served from `public/`):

- models: `public/models/`
- catalog previews: `public/catalog-previews/`
- environment previews: `public/environment/previews/`
- environment textures: `public/environment/textures/`

Sources (in `assets-source/`, built into the runtime files by the scripts below):

- model sources: `assets-source/models/<author>-<name>/`
- texture sources: `assets-source/environment/textures/<author>-<name>/`

All asset scripts are Node ESM (`scripts/*.mjs`) for cross-OS portability; the
external tools they invoke (Blender, `gltf-transform`, `toktx`, ImageMagick) still
install per-OS.

## Floor Texture Pipeline

Export floor textures with:

- `pnpm textures:export`

Requirements:

- KTX-Software `toktx` (v4.4.2+ recommended)
- ImageMagick (`convert` or `magick`)

Current compression profile:

- diffuse/albedo: ETC1S 2K
- normals: UASTC 1K with normal-map encoding
- previews: tiled diffuse WebP 640x480

## Furniture Model Pipeline

Each model source lives under `assets-source/models/<author>-<name>/`:

- `<name>.blend` — the editable source. Its Collection Exporter (Blender 4.2+)
  bakes glTF output to `//<name>.tmp.glb` (carrying copyright metadata).
- `<name>.src.glb` — the original third-party download, archived for reference.
- `<name>.md` — provenance and modification notes.
- shared `assets-source/models/LICENSE-CC-BY-4.0.txt`, linked from each `.md`.

Build the runtime models with:

- `pnpm models:export`

It runs each blend's collection exporter headlessly (reusing the in-file export
settings), compresses the textures to KTX2, and writes `public/models/<name>.glb`.
The intermediate `<name>.tmp.glb` (gitignored) is removed, so nothing uncompressed
ships in `public/`.

Requirements:

- Blender 4.2+ — found via `$BLENDER`, then `blender` on PATH, then the
  `org.blender.Blender` flatpak.
- `gltf-transform` (`@gltf-transform/cli`)
- KTX-Software `toktx` (for KTX2 texture encoding)

Compression recipe (structure-preserving — no flatten/join, so the catalog's
`nodeName`s survive):

- textures: ETC1S (KTX2), all slots, full resolution — typically ~7× smaller, and
  a large GPU-memory win. Tunable (per-slot UASTC, a resize pass, ETC1S quality)
  at the top of `scripts/export-models.mjs`.
- geometry: left uncompressed — these meshes are tiny, so Meshopt's lossy
  quantization would risk minor degradation for ~no gain.

At runtime the furniture loader and the floor textures share one KTX2 loader
(`scene/internal/three/ktx2-loader.ts`) — a single Basis-transcoder worker pool.
`KTX2Loader` resolves the transcoder from three's own bundled copy (via
`import.meta.url`), which the bundler emits as a hashed asset. The Blender helpers
(export / introspect / relink) live in `scripts/blender/`.

## Catalog Preview Thumbnails

`assets-source/models/thumbnails.blend` links the model collections, frames each
catalog item with a camera/lighting setup, and renders the catalog preview images.
Export is manual. Two cases need deliberate handling when regenerating previews:

- **Multiple catalog items per GLB.** A single GLB can hold more than one catalog
  item (e.g. the leather collection contains both the couch and the armchair,
  picked at runtime by `nodeName`). Linking the whole collection renders them
  together, so per-item previews need the items separated.
- **UI-bounds meshes.** The `uiBoundsNodeName` helper meshes ship inside the GLB
  for runtime toolbar placement, so they must stay in the export but must not
  appear in a preview render.

Recommended approach (source-side, leaving the runtime GLB unchanged): give each
model blend a parent collection that carries the exporter — keeping every item and
its UI-bounds mesh in the exported GLB — with the renderable furniture split into
per-catalog-item sub-collections and the UI-bounds meshes in their own
sub-collection. `thumbnails.blend` then links only the renderable sub-collections,
which both isolates each item and excludes the UI-bounds meshes, with no per-render
visibility overrides. As a one-off, a library override in `thumbnails.blend` can
`hide_render` the UI-bounds meshes or other items without restructuring the source.

## Validation and Runtime Contract

The manifest field schema, validation rules, and runtime/startup behavior (what
happens on fetch failure, missing `uiBoundsNodeName`, etc.) are the single source
of truth in [catalog-manifest-schema.md](../reference/catalog-manifest-schema.md).
Two authoring-pipeline checks that are not field-schema rules:

- `nodeName` values must match the actual GLTF node names in the GLB.
- Floor texture paths (`diffusePath`, `normalPath`) should point to `.ktx2`
  outputs from the texture pipeline above.

## Related Docs

- `README.md`
- `docs/reference/catalog-manifest-schema.md`
- `docs/architecture/startup-and-asset-loading.md` (how the assets built here load at runtime)
- `docs/architecture/selected-toolbar-placement.md`
- `docs/guide/url-scene-sharing.md`
