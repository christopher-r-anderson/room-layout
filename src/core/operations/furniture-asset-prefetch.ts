import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import { streamFetch } from './stream-fetch'

// Engine-free furniture-asset prefetch. This module downloads the GLB bytes with
// a streaming progress read and holds them in memory, with NO dependency on
// three/drei — so it ships in the initial shell bundle and its fetches run in
// parallel with the lazy engine chunk's download. The engine side later seeds
// these buffers into THREE.Cache (see app/chrome/seed-gltf-cache) so useGLTF
// parses from memory instead of issuing a second network request.

export interface FurnitureAssetPrefetchProgress {
  /** True while any prefetch request is in flight. */
  active: boolean
  /** Total number of files requested. */
  total: number
  /** Files fully downloaded. */
  loadedCount: number
  /** Total bytes across files whose Content-Length is known. */
  totalBytes: number
  /** Bytes received so far. */
  receivedBytes: number
  /** Completion percentage in the range 0–100, guaranteed finite. */
  percent: number
  /** URL of the most recently active request, or '' before the first request. */
  currentItem: string
}

const INITIAL_PROGRESS: FurnitureAssetPrefetchProgress = {
  active: false,
  total: 0,
  loadedCount: 0,
  totalBytes: 0,
  receivedBytes: 0,
  percent: 0,
  currentItem: '',
}

const progressStore = createStore<FurnitureAssetPrefetchProgress>()(
  () => INITIAL_PROGRESS,
)

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

function computePercent(receivedBytes: number, totalBytes: number) {
  if (totalBytes <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, (receivedBytes / totalBytes) * 100))
}

// All mutations go through functional updaters so the parallel per-file fetches
// accumulate atomically rather than racing on a read-modify-write.
function addTotalBytes(delta: number) {
  progressStore.setState((state) => {
    const totalBytes = state.totalBytes + delta
    return {
      ...state,
      totalBytes,
      percent: computePercent(state.receivedBytes, totalBytes),
    }
  })
}

function addReceivedBytes(delta: number, currentItem: string) {
  progressStore.setState((state) => {
    const receivedBytes = state.receivedBytes + delta
    return {
      ...state,
      receivedBytes,
      currentItem,
      percent: computePercent(receivedBytes, state.totalBytes),
    }
  })
}

function markFileLoaded() {
  progressStore.setState((state) => {
    const loadedCount = state.loadedCount + 1
    return { ...state, loadedCount, active: loadedCount < state.total }
  })
}

async function fetchBufferWithProgress(
  url: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  // streamFetch reports cumulative per-file progress; the aggregate store tracks
  // deltas across all files, so translate one into the other. A stalled transfer
  // rejects here (bounding gated startup loads) and surfaces as a startup error.
  let lastReceived = 0
  let totalAdded = false
  return streamFetch(url, {
    signal,
    onProgress: ({ receivedBytes, totalBytes }) => {
      if (!totalAdded && totalBytes > 0) {
        addTotalBytes(totalBytes)
        totalAdded = true
      }
      const delta = receivedBytes - lastReceived
      if (delta > 0) {
        lastReceived = receivedBytes
        addReceivedBytes(delta, url)
      }
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

  progressStore.setState((state) => ({
    ...state,
    active: urls.length > 0,
    total: urls.length,
  }))

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
        markFileLoaded()
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
  progressStore.setState(() => INITIAL_PROGRESS)
}

export function useFurnitureAssetPrefetchProgress(): FurnitureAssetPrefetchProgress {
  return useStoreWithEqualityFn(progressStore, (state) => state)
}
