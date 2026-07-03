import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGltfKtx2 } from '@/scene/internal/three/gltf-ktx2'
import {
  collectionScenesActions,
  isCollectionLoaded,
} from './collection-scenes-store'

// Imperative furniture-collection loader. It parses prefetched (gated) or
// freshly fetched (on-demand) GLB bytes with a single configured GLTFLoader and
// registers the result in the collection-scenes store. This replaces the old
// useGLTF-per-collection + Suspense + THREE.Cache-seeding approach: there is now
// one loading path for both gated and on-demand collections, nothing suspends
// (so the room renders immediately), and in-session dedup is the store itself -
// a parsed collection is never re-fetched or re-parsed. Renders nothing; the
// Scene reads the store to render furniture and to gate readiness.
//
// Configuring KTX2 needs the WebGLRenderer, so this lives inside the Canvas.
// Meshopt geometry is auto-decoded by drei's loader wiring; KTX2 textures need
// the Basis transcoder configured onto the loader.
function resourceBasePath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : ''
}

export function CollectionLoaderHost({
  gatedCollectionPaths,
  onDemandCollectionPaths,
  resolveBytes,
  onGatedError,
}: {
  gatedCollectionPaths: string[]
  onDemandCollectionPaths: string[]
  resolveBytes: (path: string, gated: boolean) => Promise<ArrayBuffer>
  onGatedError: (error: Error) => void
}) {
  const gl = useThree((state) => state.gl)
  const loaderRef = useRef<GLTFLoader | null>(null)
  if (loaderRef.current === null) {
    const loader = new GLTFLoader()
    configureGltfKtx2(loader, gl)
    loaderRef.current = loader
  }
  const inFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const loader = loaderRef.current
    if (!loader) {
      return
    }
    const inFlight = inFlightRef.current

    const load = async (path: string, gated: boolean) => {
      if (isCollectionLoaded(path) || inFlight.has(path)) {
        return
      }
      inFlight.add(path)
      try {
        const bytes = await resolveBytes(path, gated)
        const gltf = await loader.parseAsync(bytes, resourceBasePath(path))
        collectionScenesActions.registerScene(path, gltf.scene)
      } catch (error) {
        const normalized =
          error instanceof Error ? error : new Error(String(error))
        if (gated) {
          // A gated collection is required to unlock; surface the startup error.
          onGatedError(normalized)
        } else {
          // On-demand failures are isolated: the editor stays usable and only
          // this collection is unavailable.
          console.warn(
            `Failed to load furniture collection on demand: ${path}`,
            normalized,
          )
        }
      } finally {
        inFlight.delete(path)
      }
    }

    for (const path of gatedCollectionPaths) {
      void load(path, true)
    }
    for (const path of onDemandCollectionPaths) {
      void load(path, false)
    }
  }, [
    gatedCollectionPaths,
    onDemandCollectionPaths,
    resolveBytes,
    onGatedError,
  ])

  return null
}
