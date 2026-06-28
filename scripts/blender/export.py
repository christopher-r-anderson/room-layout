# Headless GLB export: runs each collection's configured exporter (Collection
# Exporters, Blender 4.2+), reusing the settings baked into the .blend — including
# the copyright metadata. Invoked as: blender --background <file>.blend --python export.py
import bpy
import addon_utils

addon_utils.enable("io_scene_gltf2")
bpy.ops.collection.export_all()
print("EXPORT_DONE", bpy.data.filepath)
