# Catalog and assets

The runtime catalog source of truth is `public/catalog-manifest.json` in the
planner workspace. Prepared models, catalog previews, and environment textures
and previews live under `public/`; application builds consume them directly.

To update the catalog, add prepared assets, update collections and entries in the
manifest, and validate IDs, relative URLs, and referenced GLTF node names. The
[manifest schema](../reference/catalog-manifest-schema.md) defines validation and
startup behavior. Floor diffuse/normal paths point to KTX2 files.

Model and texture sources, provenance, and existing export scripts belong to the
[asset tool](../../../../packages/asset-tool/README.md). Its
[export guide](../../../../packages/asset-tool/docs/exporting.md) covers external
tools, compression, Blender libraries, and staging. Exporting is independent of
building the app; published assets are committed inputs.

Furniture and floor textures share the KTX2 loader in
`src/scene/internal/three/ktx2-loader.ts`. Vite emits three's bundled Basis
transcoder assets; no manual hosting or copying step is needed.

See [startup and asset loading](startup-and-asset-loading.md),
[selected toolbar placement](selected-toolbar-placement.md), and
[attribution](../reference/assets-attribution.md) for runtime integration.
