import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Object3D } from 'three'
import { configureGltfKtx2 } from '@/scene/internal/three/gltf-ktx2'
import { collectionScenesActions } from './collection-scenes-store'

// Loads and parses a single furniture-collection GLB, then registers its scene
// in the collection-scenes store. `useGLTF` suspends this component until the
// collection parses; because each loader is mounted under its own Suspense
// boundary (a sibling of Scene, not a child), that suspension never blocks the
// room from rendering. Meshopt geometry is auto-decoded by drei; KTX2 textures
// need the Basis transcoder wired onto the loader.
export function CollectionLoader({ path }: { path: string }) {
  const gl = useThree((state) => state.gl)
  const { scene } = useGLTF(path, false, true, (loader) => {
    configureGltfKtx2(loader as unknown as GLTFLoader, gl)
  }) as { scene: Object3D }

  useLayoutEffect(() => {
    collectionScenesActions.registerScene(path, scene)

    return () => {
      collectionScenesActions.unregisterScene(path)
    }
  }, [path, scene])

  return null
}
