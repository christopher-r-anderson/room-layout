import type { WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGltfKtx2 } from '@/scene/internal/three/ktx2-loader'
import { registerCollectionScene } from './collection-scene-registry'

function resourceBasePath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : ''
}

// The scene's half of collection loading: parse GLB bytes and register the
// resulting scene root. Created once per Scene mount (configuring KTX2 needs the
// live renderer) and exposed to core through scene services - core drives the
// whole load (fetch -> this parse -> mark loaded) imperatively, so the pipeline
// never depends on React render timing. Registration happens here, before core
// marks the collection loaded, which is what lets consumers read the registry on
// the strength of the core flag.
export function createCollectionSceneLoader(
  renderer: WebGLRenderer,
): (path: string, bytes: ArrayBuffer) => Promise<void> {
  const loader = new GLTFLoader()
  configureGltfKtx2(loader, renderer)

  return async (path: string, bytes: ArrayBuffer) => {
    const gltf = await loader.parseAsync(bytes, resourceBasePath(path))
    registerCollectionScene(path, gltf.scene)
  }
}
