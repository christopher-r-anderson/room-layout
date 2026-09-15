# Asset processing

The asset tool exports furniture models and floor textures for the
planner. It does not run during application builds.

## Floor Texture Pipeline

Export floor textures with:

- `pnpm textures:export`

Requirements:

- KTX-Software `toktx` (v4.0+)
- ImageMagick (`convert` or `magick`)

Current compression profile:

- diffuse/albedo: ETC1S 2K
- normals: UASTC 1K with normal-map encoding
- previews: tiled diffuse WebP 640x480

## Furniture Model Pipeline

Each model source lives under `assets-source/models/<author>-<name>/`:

- `<name>.blend` - the editable source. Its Collection Exporter (Blender 4.2+)
  bakes glTF output to `//<name>.tmp.glb` (carrying copyright metadata).
- `<name>.src.glb` - the original third-party download, archived for reference.
- `<name>.md` - provenance and modification notes.
- shared `assets-source/models/LICENSE-CC-BY-4.0.txt`, linked from each `.md`.

Build the runtime models with:

- `pnpm models:export`

It runs every local collection's configured exporters headlessly (reusing the
in-file export settings), compresses the textures to KTX2, and writes `apps/room-layout/public/models/<name>.glb` at repository root.
The intermediate `<name>.tmp.glb` (gitignored) is removed, so nothing uncompressed
ships in the planner's `public/`.

Requirements:

- Blender 4.2+ - found via `$BLENDER`, then `blender` on PATH, then the
  `org.blender.Blender` flatpak.
- `gltf-transform` (`@gltf-transform/cli`)
- KTX-Software `toktx` (for KTX2 texture encoding)

Compression recipe (structure-preserving - no flatten/join, so the catalog's
`nodeName`s survive):

- textures: ETC1S (KTX2), all slots, full resolution - typically ~7x smaller, and
  a large GPU-memory win. Tunable (per-slot UASTC, a resize pass, ETC1S quality)
  at the top of `scripts/export-models.mjs`.
- geometry: left uncompressed - these meshes are tiny, so Meshopt's lossy
  quantization would risk minor degradation for ~no gain.

The Blender helpers (export / introspect / relink) live in `scripts/blender/`.
Runtime loading and transcoder delivery belong to the planner's
[catalog guide](../../../apps/room-layout/docs/architecture/catalog-and-assets.md).

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
model blend a parent collection that carries the exporter - keeping every item and
its UI-bounds mesh in the exported GLB - with the renderable furniture split into
per-catalog-item sub-collections and the UI-bounds meshes in their own
sub-collection. `thumbnails.blend` then links only the renderable sub-collections,
which both isolates each item and excludes the UI-bounds meshes, with no per-render
visibility overrides. As a one-off, a library override in `thumbnails.blend` can
`hide_render` the UI-bounds meshes or other items without restructuring the source.

## Paths and staging

Sources live in `assets-source/` in this workspace; preserve the tree so Blender's
relative library links remain valid. Default output is the planner's `public/`.
Commands resolve their defaults from the script location, independent of the
calling directory. `ASSET_SOURCE_DIR` and `ASSET_OUTPUT_DIR` accept explicit source
and output roots; use absolute paths for the same behavior from root and filters.
Model intermediates are written beside the source `.blend`, so copy the complete
source tree when verifying exports without touching original sources.

The operator must choose a staging location that both the host tools and Blender
can access. Create the copied source tree before running these commands, then
replace the example paths with absolute paths to that copy and its output:

```bash
ASSET_SOURCE_DIR=/absolute/path/to/asset-check/sources ASSET_OUTPUT_DIR=/absolute/path/to/asset-check/output pnpm models:export
ASSET_SOURCE_DIR=/absolute/path/to/asset-check/sources ASSET_OUTPUT_DIR=/absolute/path/to/asset-check/output pnpm textures:export
```

Flatpak Blender may see a different filesystem from the host. Host `/tmp` is not
included in the `host` filesystem permission by default; access must be explicitly
granted. See [Flatpak filesystem permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html#reserved-paths).
If the selected paths are inaccessible, stop and correct access before retrying.
The scripts do not select a fallback directory or change permissions.

At repository root these commands forward to this workspace. Direct equivalents
are `pnpm --filter @room-layout/asset-tool models:export` and `textures:export`.
External executables must be available on PATH (or via `BLENDER`). Verify expected
output files as well as exit status. Both exporters return nonzero if an input
fails, a required input/output is missing, or a tool fails. Tool diagnostics and
the affected paths are printed; subsequent inputs continue where possible. Failed
runs preserve previous prepared files when a producer fails. Outputs are generated
in fresh temporary directories under the supplied output root and checked before
publication. For each texture, all three outputs must pass before publication
begins. Each file is replaced by rename; publishing multiple files is not a single
filesystem transaction. Temporary directories are removed on success and failure.
Blender's prior `.tmp.glb` intermediates are removed before export, and its helper
checks every configured exporter's result and expected output, independent of the
active collection. Configured paths must name `.tmp.glb` files beside the blend.
Duplicate model destinations fail instead of overwriting an earlier model.

Texture batches require all directories in the configured texture map, including
under a source override. Symlinked source directories are followed. Successful
batches return zero. Unknown texture folders and model folders without a `.blend`
source are reported as intentional skips.

Run `pnpm --filter @room-layout/asset-tool test:run` for failure-path regression
tests. They use disposable source/output trees and POSIX shell stub tools, without
reading or regenerating committed assets. The root `pnpm test:run` includes them.
The Blender helper also has disposable integration tests, run explicitly with an
accessible Blender executable from this workspace:

```bash
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/test_export.py
```

The thumbnail scene currently has a missing `LeatherCouchCollection` link. Preview
rendering is manual and separate from model/texture export.

## Source and runtime contracts

Preserve author/source/license/modification records beside source assets and keep
third-party licenses intact. Runtime credit data and catalog IDs belong to the
planner; see its [catalog guide](../../../apps/room-layout/docs/architecture/catalog-and-assets.md)
and [attribution](../../../apps/room-layout/docs/reference/assets-attribution.md).
