# Asset tool

Exports furniture models and floor textures into the planner's
prepared assets. Node ESM scripts invoke Blender, glTF Transform, KTX-Software,
and ImageMagick. The application build does not require these tools.

```bash
pnpm --filter @room-layout/asset-tool models:export
pnpm --filter @room-layout/asset-tool textures:export
```

See [exporting](docs/exporting.md) for prerequisites, source relationships,
compression settings, temporary destinations, and output checks. Keep source
files and provenance together in `assets-source/`.
