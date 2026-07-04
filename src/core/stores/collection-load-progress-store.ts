import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import { shallow } from 'zustand/shallow'

// Download progress for furniture-collection loads, keyed by sourcePath. A single
// per-collection store feeds both readouts: the Add drawer reads one collection's
// percent, and the startup loader aggregates over the gated collections. Both the
// engine-free gated prefetch and on-demand loads write here.
export interface CollectionDownloadProgress {
  receivedBytes: number
  // Bytes expected from Content-Length, or 0 when the server does not send it.
  totalBytes: number
}

interface CollectionLoadProgressState {
  progressByPath: Map<string, CollectionDownloadProgress>
}

const collectionLoadProgressStore = createStore<CollectionLoadProgressState>()(
  () => ({
    progressByPath: new Map<string, CollectionDownloadProgress>(),
  }),
)

export const collectionLoadProgressActions = {
  setProgress(path: string, progress: CollectionDownloadProgress) {
    collectionLoadProgressStore.setState((state) => {
      const progressByPath = new Map(state.progressByPath)
      progressByPath.set(path, progress)
      return { progressByPath }
    })
  },
  reset() {
    collectionLoadProgressStore.setState({
      progressByPath: new Map<string, CollectionDownloadProgress>(),
    })
  },
}

// The download percent for one collection, or null when its size is unknown or it
// is not loading (so the Add button falls back to an indeterminate spinner).
export function useCollectionLoadPercent(path: string | null): number | null {
  return useStoreWithEqualityFn(collectionLoadProgressStore, (state) => {
    if (!path) {
      return null
    }
    const progress = state.progressByPath.get(path)
    if (!progress || progress.totalBytes <= 0) {
      return null
    }
    return Math.round(
      Math.max(
        0,
        Math.min(100, (progress.receivedBytes / progress.totalBytes) * 100),
      ),
    )
  })
}

export interface GatedLoadProgress {
  // Number of gated collections, and how many have fully downloaded.
  total: number
  loadedCount: number
  // Aggregate download percent (0-100) across the gated set.
  percent: number
}

// Aggregate download progress across the gated collections, for the startup
// loader. Computed at read time from the per-collection store.
export function useGatedLoadProgress(gatedPaths: string[]): GatedLoadProgress {
  return useStoreWithEqualityFn(
    collectionLoadProgressStore,
    (state) => {
      let receivedBytes = 0
      let totalBytes = 0
      let loadedCount = 0
      for (const path of gatedPaths) {
        const progress = state.progressByPath.get(path)
        if (!progress) {
          continue
        }
        receivedBytes += progress.receivedBytes
        totalBytes += progress.totalBytes
        if (
          progress.totalBytes > 0 &&
          progress.receivedBytes >= progress.totalBytes
        ) {
          loadedCount += 1
        }
      }
      const percent =
        totalBytes > 0
          ? Math.max(0, Math.min(100, (receivedBytes / totalBytes) * 100))
          : 0
      return { total: gatedPaths.length, loadedCount, percent }
    },
    shallow,
  )
}
