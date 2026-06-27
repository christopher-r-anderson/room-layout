import { Cache } from 'three'
import { whenPrefetched } from '@/core/operations/furniture-asset-prefetch'

// Engine-side half of the prefetch handoff. The bytes were downloaded engine-free
// (furniture-asset-prefetch); here we seed them into THREE.Cache so the Scene's
// useGLTF resolves from memory instead of issuing a second network request. This
// keeps drei's useGLTF (and its Draco/Meshopt config) while making the download
// deterministic and independent of HTTP cache-control headers.

let current: { key: string; promise: Promise<void> } | null = null

function seedKey(epoch: number, paths: string[]) {
  return `${String(epoch)}:${paths.join('\n')}`
}

// Returns a stable promise (cached per epoch + path-set so React's `use` suspends
// on a consistent identity) that resolves once every prefetched buffer is seeded
// into THREE.Cache, and rejects if a prefetch failed (surfaced to the scene asset
// error boundary). Keying by the scene epoch means a retry re-awaits the fresh
// prefetch and re-seeds rather than reusing the prior cycle's settled promise.
export function getSeedPromise(epoch: number, paths: string[]): Promise<void> {
  const key = seedKey(epoch, paths)
  if (current?.key === key) {
    return current.promise
  }

  const promise =
    paths.length === 0
      ? Promise.resolve()
      : Promise.all(paths.map((path) => whenPrefetched(path))).then(
          (loadedBuffers) => {
            Cache.enabled = true
            paths.forEach((path, index) => {
              Cache.add(path, loadedBuffers[index])
            })
          },
        )

  current = { key, promise }
  return promise
}
