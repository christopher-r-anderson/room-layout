import { streamFetch } from './stream-fetch'
import { collectionLoadingActions } from '@/core/stores/collection-loading-store'

// The single byte source for furniture collections. Engine-free (ArrayBuffers
// only, no three import), so it ships in the shell: bootstrap warms the gated
// (restored-scene) collections here so their bytes download in parallel with the
// lazy engine chunk, and on-demand collections start on first request - both
// through the same fetch, with the same stall timeout and per-collection progress
// reporting. See docs/architecture/startup-and-asset-loading.md.

const requests = new Map<string, Promise<ArrayBuffer>>()
let abortController: AbortController | null = null

/**
 * Resolves with a collection's GLB bytes, fetching at most once per path:
 * concurrent and repeated calls share the in-flight request or the buffered
 * result. A failed fetch rejects its current waiters and forgets the entry, so a
 * later call (a re-request after a transient failure) retries.
 */
export function fetchCollectionBytes(path: string): Promise<ArrayBuffer> {
  const existing = requests.get(path)
  if (existing) {
    return existing
  }

  abortController ??= new AbortController()
  const request = streamFetch(path, {
    signal: abortController.signal,
    onProgress: (progress) => {
      collectionLoadingActions.setProgress(path, progress)
    },
  })
  requests.set(path, request)
  request.catch(() => {
    if (requests.get(path) === request) {
      requests.delete(path)
    }
  })
  return request
}

/**
 * Start downloading collections ahead of use (the gated set, at bootstrap).
 * Fire-and-forget: a failure is swallowed here and surfaces when the loader
 * fetches the same path.
 */
export function warmCollectionBytes(paths: string[]): void {
  for (const path of paths) {
    fetchCollectionBytes(path).catch(() => {
      // Reported by the consuming fetch of this path.
    })
  }
}

/**
 * Drop a buffered result once its consumer has parsed it. The parsed scene lives
 * in the collection registry from here on; holding the raw bytes too would only
 * cost memory.
 */
export function releaseCollectionBytes(path: string): void {
  requests.delete(path)
}

/** Abort in-flight fetches and drop all buffered bytes (the retry teardown). */
export function clearCollectionBytes(): void {
  abortController?.abort()
  abortController = null
  requests.clear()
}
