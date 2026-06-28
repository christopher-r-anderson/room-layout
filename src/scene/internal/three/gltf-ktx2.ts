import type { WebGLRenderer } from 'three'
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'

// Configures the furniture GLTFLoader to decode KTX2 (Basis) textures embedded in
// the compressed GLBs, reusing the self-hosted transcoder in public/basis/ (the
// same one the floor textures use). Meshopt geometry needs no setup here — drei's
// useGLTF wires MeshoptDecoder automatically. detectSupport requires the live
// renderer, so it is run once per renderer.

function getBasisTranscoderPath(): string {
  return `${import.meta.env.BASE_URL}basis/`
}

let ktx2Loader: KTX2Loader | null = null
const supportDetectedForRenderer = new WeakSet<WebGLRenderer>()

function getKtx2Loader(): KTX2Loader {
  ktx2Loader ??= new KTX2Loader()
    .setTranscoderPath(getBasisTranscoderPath())
    .setWorkerLimit(2)
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
