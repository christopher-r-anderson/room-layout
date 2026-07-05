import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGltfKtx2 } from '@/scene/internal/three/ktx2-loader'
import {
  collectionLoadingActions,
  isCollectionFailed,
  isCollectionLoaded,
} from '@/core/scene-contracts'
import { registerCollectionScene } from './collection-scene-registry'

// Parses each requested collection's GLB bytes, registers the parsed scene in the
// scene registry, and reports the outcome (loaded/failed) to the core loading
// store; `resolveBytes` (from the app) supplies the bytes. A hook, not a component,
// because it renders nothing - and it must run inside the Canvas: configuring KTX2
// needs the WebGLRenderer. In-session dedup is the store (a loaded or failed
// collection is not re-fetched). See docs/architecture/startup-and-asset-loading.md.
function resourceBasePath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : ''
}

export function useCollectionLoader({
  collectionPaths,
  resolveBytes,
}: {
  collectionPaths: string[]
  resolveBytes: (path: string) => Promise<ArrayBuffer>
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
        registerCollectionScene(path, gltf.scene)
        collectionLoadingActions.markLoaded(path)
      } catch (error) {
        // Report the failure (classified in core) so an awaiting add rejects
        // instead of hanging and the outcome drives catalog/startup handling. Not
        // retried until cleared by a re-request.
        collectionLoadingActions.markFailed(path, error)
        console.warn(`Failed to load furniture collection: ${path}`, error)
      } finally {
        inFlight.delete(path)
      }
    }

    for (const path of collectionPaths) {
      void load(path)
    }
  }, [collectionPaths, resolveBytes])
}
