import { useCollectionLoader } from './internal/furniture/use-collection-loader'

// Public scene surface: a null-rendering host that runs the collection loader
// inside the Canvas (the loader needs the WebGLRenderer to configure KTX2). All
// loading logic lives in the useCollectionLoader hook; this exists only to give it
// a mount point in the r3f tree. scene-canvas keys it by the scene epoch so a retry
// remounts a fresh loader.
export function CollectionLoader(props: {
  collectionPaths: string[]
  resolveBytes: (path: string) => Promise<ArrayBuffer>
}) {
  useCollectionLoader(props)
  return null
}
