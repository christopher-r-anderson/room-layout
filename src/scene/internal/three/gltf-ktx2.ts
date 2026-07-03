import type { WebGLRenderer } from 'three'
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'

// Configures the furniture GLTFLoader to decode KTX2 (Basis) textures embedded in
// the compressed GLBs, using the same KTX2Loader setup as the floor textures.
// KTX2Loader resolves the Basis transcoder from three's own bundled copy (via
// import.meta.url), so no transcoder path is configured here. Meshopt geometry
// needs no setup either — drei's useGLTF wires MeshoptDecoder automatically.
// detectSupport requires the live renderer, so it is run once per renderer.

let ktx2Loader: KTX2Loader | null = null
const supportDetectedForRenderer = new WeakSet<WebGLRenderer>()

function getKtx2Loader(): KTX2Loader {
  ktx2Loader ??= new KTX2Loader().setWorkerLimit(2)
  return ktx2Loader
}

export function configureGltfKtx2(loader: GLTFLoader, renderer: WebGLRenderer) {
  const ktx2 = getKtx2Loader()
  if (!supportDetectedForRenderer.has(renderer)) {
    ktx2.detectSupport(renderer)
    supportDetectedForRenderer.add(renderer)
  }
  loader.setKTX2Loader(ktx2)
}
