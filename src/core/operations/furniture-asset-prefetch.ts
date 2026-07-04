import { streamFetch } from './stream-fetch'
import { collectionLoadProgressActions } from '@/core/stores/collection-load-progress-store'

// Engine-free furniture-asset prefetch for the gated (restored-scene) collections.
// It downloads the GLB bytes and holds them in memory, with NO dependency on
// three/drei — so it ships in the initial shell bundle and its fetches run in
// parallel with the lazy engine chunk's download. The engine-side loader later
// parses these buffers (awaited via whenPrefetched) instead of refetching.
// Download progress is reported per collection to collection-load-progress-store.

interface AssetDeferred {
  promise: Promise<ArrayBuffer>
  resolve: (buffer: ArrayBuffer) => void
  reject: (error: unknown) => void
}

// One deferred per URL. The engine-side seed-gate may await a URL (via
// whenPrefetched) before its fetch has been kicked off — on a retry the Scene
// remounts before the re-prefetch runs — so a not-yet-started URL returns a
// pending promise rather than rejecting, and the later prefetch resolves it.
const deferreds = new Map<string, AssetDeferred>()
const started = new Set<string>()
let abortController: AbortController | null = null

function deferredFor(url: string): AssetDeferred {
  const existing = deferreds.get(url)
  if (existing) {
    return existing
  }

  let resolve!: (buffer: ArrayBuffer) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<ArrayBuffer>((res, rej) => {
    resolve = res
    reject = rej
  })
  const deferred: AssetDeferred = { promise, resolve, reject }
  deferreds.set(url, deferred)
  return deferred
}

async function fetchBufferWithProgress(
  url: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  // Report per-collection progress; a stalled transfer rejects here (bounding
  // gated startup loads) and surfaces as a startup error.
  return streamFetch(url, {
    signal,
    onProgress: (progress) => {
      collectionLoadProgressActions.setProgress(url, progress)
    },
  })
}

/**
 * Start downloading the given furniture collection GLB URLs. Idempotent: URLs
 * already buffered or in flight are skipped, so repeated calls (e.g. effect
 * re-runs) do not re-fetch. Fire-and-forget; await readiness via
 * {@link whenPrefetched}.
 */
export function prefetchFurnitureCollections(urls: string[]): void {
  abortController ??= new AbortController()
  const { signal } = abortController

  for (const url of urls) {
    if (started.has(url)) {
      continue
    }
    started.add(url)

    const deferred = deferredFor(url)
    void fetchBufferWithProgress(url, signal)
      .then((buffer) => {
        // A clear() since this fetch began swaps the deferred; ignore stale
        // completions so they cannot resolve a fresh cycle's waiter.
        if (deferreds.get(url) !== deferred) {
          return
        }
        deferred.resolve(buffer)
      })
      .catch((error: unknown) => {
        if (deferreds.get(url) !== deferred) {
          return
        }
        deferred.reject(error)
      })
  }
}

/**
 * Resolves with the prefetched bytes for a URL. If the URL has not been
 * requested yet (e.g. the Scene remounted before a retry's re-prefetch ran), the
 * returned promise stays pending until the prefetch starts and completes it.
 */
export function whenPrefetched(url: string): Promise<ArrayBuffer> {
  return deferredFor(url).promise
}

/** Abort in-flight prefetches and drop all buffered bytes (used on retry). */
export function clearFurnitureAssetPrefetch(): void {
  abortController?.abort()
  abortController = null
  started.clear()
  deferreds.clear()
  collectionLoadProgressActions.reset()
}
