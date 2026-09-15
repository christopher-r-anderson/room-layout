# Read-only: dump a .blend's collections, configured exporters (+ baked paths),
# and linked libraries. Usage: blender --background <file>.blend --python introspect.py
import bpy

print(f"=== FILE: {bpy.data.filepath}  (blender {bpy.app.version_string})")
if bpy.data.libraries:
    print("=== Linked libraries:")
    for lib in bpy.data.libraries:
        print(f"    {lib.filepath}")
for coll in bpy.data.collections:
    if coll.library is not None:
        continue
    print(f"=== Collection: {coll.name!r}  objects={len(coll.objects)} all={len(coll.all_objects)}")
    for i, exp in enumerate(getattr(coll, "exporters", [])):
        props = getattr(exp, "export_properties", None)
        fp = getattr(props, "filepath", "<none>") if props else "<no props>"
        print(f"    exporter[{i}] filepath={fp!r}")
