import type { WebGLRenderer } from 'three'
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'

// Shared KTX2 (Basis) loader for the whole scene. One instance owns a single
// Basis-transcoder Web Worker pool, reused across furniture GLBs and floor
// textures rather than one pool per consumer. KTX2Loader resolves the transcoder
// from three's own bundled copy (via import.meta.url), so no path is configured.
// detectSupport probes the live renderer, so it is run once per renderer.
let ktx2Loader: KTX2Loader | null = null
const supportDetectedForRenderer = new WeakSet<WebGLRenderer>()

export function getKtx2Loader(renderer: WebGLRenderer): KTX2Loader {
  ktx2Loader ??= new KTX2Loader().setWorkerLimit(2)
  if (!supportDetectedForRenderer.has(renderer)) {
    ktx2Loader.detectSupport(renderer)
    supportDetectedForRenderer.add(renderer)
  }
  return ktx2Loader
}

// Configures a furniture GLTFLoader to decode the KTX2 (Basis) textures embedded
// in the compressed GLBs, using the shared loader. This is the only decoder the
// GLBs need: the asset pipeline ships geometry uncompressed (see
// docs/architecture/catalog-and-assets.md), so no Meshopt/Draco setup here.
export function configureGltfKtx2(loader: GLTFLoader, renderer: WebGLRenderer) {
  loader.setKTX2Loader(getKtx2Loader(renderer))
}
