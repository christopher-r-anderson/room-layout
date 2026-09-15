# Export every local collection using its stored settings, independent of UI focus.
import os
import traceback

import bpy
import addon_utils

addon_utils.enable("io_scene_gltf2")

failures = []
outputs = set()
count = 0
for collection in bpy.data.collections:
    if collection.library is not None:
        continue
    for index, exporter in enumerate(collection.exporters):
        label = f"{bpy.data.filepath}: collection {collection.name!r}, exporter {index}"
        try:
            configured = exporter.export_properties.filepath
            output = os.path.abspath(bpy.path.abspath(configured))
            source_dir = os.path.dirname(bpy.data.filepath)
            if not configured or not output.endswith(".tmp.glb") or os.path.dirname(output) != source_dir:
                raise RuntimeError(f"Expected a .tmp.glb filepath beside the blend: {configured!r}")
            if output in outputs:
                raise RuntimeError(f"Duplicate exporter output: {output}")
            outputs.add(output)
            if os.path.lexists(output):
                os.remove(output)
            with bpy.context.temp_override(collection=collection):
                result = bpy.ops.collection.exporter_export(index=index)
            if result != {"FINISHED"}:
                raise RuntimeError(f"Exporter returned {result}: {output}")
            # Blender versions can swallow nested exporter errors and return FINISHED.
            if not os.path.isfile(output):
                raise RuntimeError(f"Expected output file: {output}")
            count += 1
        except Exception as error:
            traceback.print_exc()
            failures.append(f"{label}: {error}")

if failures:
    raise RuntimeError("Collection export failed:\n" + "\n".join(failures))
if count == 0:
    raise RuntimeError(f"No configured local collection exporters in {bpy.data.filepath}")
print("EXPORT_DONE", bpy.data.filepath, count)
