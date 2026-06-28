# Remap linked-library paths after moving/renaming source files.
# Usage: blender --background <file>.blend --python relink.py -- <old_substr> <new_substr>
import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
old_sub, new_sub = argv[0], argv[1]
changed = False
for lib in bpy.data.libraries:
    if old_sub in lib.filepath:
        updated = lib.filepath.replace(old_sub, new_sub)
        print(f"  relink {lib.filepath!r} -> {updated!r}")
        lib.filepath = updated
        lib.reload()
        changed = True
if changed:
    bpy.ops.wm.save_mainfile()
    print("SAVED")
else:
    print("NOCHANGE")
