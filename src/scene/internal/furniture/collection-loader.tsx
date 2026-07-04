import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGltfKtx2 } from '@/scene/internal/three/gltf-ktx2'
import type { CollectionLoadFailureKind } from '../../scene.types'
import {
  collectionScenesActions,
  isCollectionFailed,
  isCollectionLoaded,
} from './collection-scenes-store'

// Imperative furniture-collection loader. It parses each requested collection's
// GLB bytes with a single configured GLTFLoader and records the outcome in the
// collection-scenes store - a parsed scene on success, a failure kind on error.
// It is a pure mechanism: it does not distinguish gated from on-demand and has no
// startup coupling. `resolveBytes` (supplied by the app) decides where a
// collection's bytes come from, and readiness/error policy is derived from the
// store by the Scene. In-session dedup is the store itself: a loaded or failed
// collection is never re-fetched (a re-request clears its failure first).
//
// Configuring KTX2 needs the WebGLRenderer, so this lives inside the Canvas.
// Meshopt geometry is auto-decoded; KTX2 textures need the Basis transcoder.
function resourceBasePath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : ''
}

export function CollectionLoader({
  collectionPaths,
  resolveBytes,
  classifyLoadError,
}: {
  collectionPaths: string[]
  resolveBytes: (path: string) => Promise<ArrayBuffer>
  // Supplied by the app (which owns the core fetch errors): classifies a failure
  // as permanent ('unavailable') or transient ('connection').
  classifyLoadError: (error: unknown) => CollectionLoadFailureKind
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

    const load = async (path: string) => {
      if (
        isCollectionLoaded(path) ||
        isCollectionFailed(path) ||
        inFlight.has(path)
      ) {
        return
      }
      inFlight.add(path)
      try {
        const bytes = await resolveBytes(path)
        const gltf = await loader.parseAsync(bytes, resourceBasePath(path))
        collectionScenesActions.registerScene(path, gltf.scene)
      } catch (error) {
        // Record why it failed so an awaiting add rejects (rather than hanging), a
        // re-add can retry a transient failure, the catalog can mark a permanently
        // unavailable item, and the Scene can surface a gated failure as a startup
        // error. Not retried until the failure is cleared (a re-request).
        collectionScenesActions.markFailed(path, classifyLoadError(error))
        console.warn(`Failed to load furniture collection: ${path}`, error)
      } finally {
        inFlight.delete(path)
      }
    }

    for (const path of collectionPaths) {
      void load(path)
    }
  }, [collectionPaths, resolveBytes, classifyLoadError])

  return null
}
