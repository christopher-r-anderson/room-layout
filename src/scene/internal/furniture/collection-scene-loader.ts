import type { WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { configureGltfKtx2 } from '@/scene/internal/three/ktx2-loader'
import { validateCatalogAssetNodes } from '@/scene/internal/validate-catalog-asset-nodes'
import { registerCollectionScene } from './collection-scene-registry'

function resourceBasePath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : ''
}

// The scene's half of collection loading: parse GLB bytes, validate that every
// catalog entry of the collection can resolve its manifest-referenced nodes, and
// register the resulting scene root. Created once per Scene mount (configuring
// KTX2 needs the live renderer) and exposed to core through scene services -
// core drives the whole load (fetch -> this -> mark loaded) imperatively, so the
// pipeline never depends on React render timing. Validation runs before
// registration and registration before core marks the collection loaded, so a
// broken asset is classified as a load failure (unavailable) instead of blowing
// up later in the add flow, and consumers may read the registry on the strength
// of the core flag.
export function createCollectionSceneLoader({
  renderer,
  catalog,
  collections,
}: {
  renderer: WebGLRenderer
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
}): (path: string, bytes: ArrayBuffer) => Promise<void> {
  const loader = new GLTFLoader()
  configureGltfKtx2(loader, renderer)

  return async (path: string, bytes: ArrayBuffer) => {
    const gltf = await loader.parseAsync(bytes, resourceBasePath(path))

    const collection = collections.find(
      (candidate) => candidate.sourcePath === path,
    )
    if (collection) {
      validateCatalogAssetNodes({
        entries: catalog.filter(
          (entry) => entry.collectionId === collection.id,
        ),
        sourceScene: gltf.scene,
      })
    }

    registerCollectionScene(path, gltf.scene)
  }
}
