# Run with Blender --background --factory-startup --python-exit-code 1 --python <this file>.
import os
from pathlib import Path
import runpy
import tempfile
import unittest

import bpy
import addon_utils
from bpy.props import StringProperty

HELPER = Path(__file__).with_name("export.py")


class FixtureExport(bpy.types.Operator):
    bl_idname = "export_scene.asset_test"
    bl_label = "Asset test exporter"
    filepath: StringProperty(subtype="FILE_PATH")
    collection: StringProperty()

    def execute(self, context):
        if "throws" in self.filepath:
            raise RuntimeError("fixture exporter error")
        if "cancelled" in self.filepath:
            return {"CANCELLED"}
        if "omitted" not in self.filepath:
            Path(self.filepath).write_bytes(b"fixture GLB")
        return {"FINISHED"}


class FixtureHandler(bpy.types.FileHandler):
    bl_idname = "IO_FH_asset_test"
    bl_label = "Asset test"
    bl_export_operator = "export_scene.asset_test"
    bl_file_extensions = ".glb"


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="blender-export-test-")
        self.addCleanup(self.temp.cleanup)
        for collection in list(bpy.data.collections):
            bpy.data.collections.remove(collection)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(self.temp.name, "fixture.blend"))

    def exporter(self, collection_name, name):
        collection = bpy.data.collections.get(collection_name)
        if collection is None:
            collection = bpy.data.collections.new(collection_name)
            bpy.context.scene.collection.children.link(collection)
        with bpy.context.temp_override(collection=collection):
            bpy.ops.collection.exporter_add(name=FixtureHandler.bl_idname)
        output = Path(self.temp.name, name + ".tmp.glb")
        collection.exporters[-1].export_properties.filepath = "//" + output.name
        return output

    def run_export(self):
        runpy.run_path(str(HELPER), run_name="__main__")

    def test_inactive_collections_and_multiple_exporters(self):
        outputs = [self.exporter("First", "one"), self.exporter("First", "two"), self.exporter("Other", "three")]
        self.run_export()
        self.assertTrue(all(output.is_file() for output in outputs))

    def test_real_gltf_exporter_preserves_stored_settings(self):
        addon_utils.enable("io_scene_gltf2")
        collection = bpy.data.collections.new("GLTF fixture")
        bpy.context.scene.collection.children.link(collection)
        mesh = bpy.data.meshes.new("triangle")
        mesh.from_pydata([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [], [(0, 1, 2)])
        collection.objects.link(bpy.data.objects.new("triangle", mesh))
        with bpy.context.temp_override(collection=collection):
            bpy.ops.collection.exporter_add(name="IO_FH_gltf2")
        props = collection.exporters[0].export_properties
        props.filepath = "//real.tmp.glb"
        props.export_format = "GLB"
        props.export_copyright = "fixture provenance"
        self.run_export()
        data = Path(self.temp.name, "real.tmp.glb").read_bytes()
        self.assertEqual(data[:4], b"glTF")
        self.assertIn(b"fixture provenance", data)

    def test_missing_second_output_even_with_finished_result(self):
        self.exporter("First", "one")
        stale = self.exporter("First", "omitted")
        stale.write_bytes(b"stale")
        later = self.exporter("Other", "later")
        with self.assertRaisesRegex(RuntimeError, "Expected output file.*omitted"):
            self.run_export()
        self.assertTrue(later.is_file())
        self.assertFalse(stale.exists())

    def test_operator_exception(self):
        self.exporter("First", "throws")
        with self.assertRaisesRegex(RuntimeError, "Expected output file.*throws"):
            self.run_export()

    def test_cancelled_result(self):
        self.exporter("First", "cancelled")
        with self.assertRaisesRegex(RuntimeError, "CANCELLED"):
            self.run_export()

    def test_duplicate_paths(self):
        self.exporter("First", "duplicate")
        self.exporter("Other", "duplicate")
        with self.assertRaisesRegex(RuntimeError, "Duplicate exporter output"):
            self.run_export()

    def test_no_exporters(self):
        with self.assertRaisesRegex(RuntimeError, "No configured local collection exporters"):
            self.run_export()


bpy.utils.register_class(FixtureExport)
bpy.utils.register_class(FixtureHandler)
result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ExportTests))
if not result.wasSuccessful():
    raise RuntimeError("Blender exporter regression tests failed")
