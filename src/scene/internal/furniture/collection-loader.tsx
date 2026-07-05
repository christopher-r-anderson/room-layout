import { useCollectionLoader } from './use-collection-loader'

// Null-rendering host that runs the collection loader inside the Canvas (it needs
// the WebGLRenderer to configure KTX2). All loading logic lives in the hook; this
// exists only to give it a mount point in the r3f tree. scene-canvas keys it by the
// scene epoch so a retry remounts a fresh loader.
export function CollectionLoader(props: {
  collectionPaths: string[]
  resolveBytes: (path: string) => Promise<ArrayBuffer>
}) {
  useCollectionLoader(props)
  return null
}
