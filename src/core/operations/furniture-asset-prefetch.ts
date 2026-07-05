import { streamFetch } from './stream-fetch'
import { collectionLoadingActions } from '@/core/stores/collection-loading-store'

// Engine-free prefetch of the gated (restored-scene) collections: it downloads the
// GLB bytes and holds them in memory with no three/drei dependency, so it ships in
// the shell and fetches in parallel with the lazy engine chunk rather than waiting
// for it. The loader later parses these buffers (awaited via whenPrefetched)
// instead of refetching. See docs/architecture/startup-and-asset-loading.md.

interface AssetDeferred {
  promise: Promise<ArrayBuffer>
  resolve: (buffer: ArrayBuffer) => void
  reject: (error: unknown) => void
}

// One deferred per URL. The collection loader may await a URL (via
// whenPrefetched) before its fetch has been kicked off — on a retry the loader
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
      collectionLoadingActions.setProgress(url, progress)
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

// Abort in-flight prefetches and drop all buffered bytes (used on retry). The
// loading-store reset (progress/loaded/wanted/failed) is owned by
// resetCollectionLoading, which the retry runs alongside this.
export function clearFurnitureAssetPrefetch(): void {
  abortController?.abort()
  abortController = null
  started.clear()
  deferreds.clear()
}
