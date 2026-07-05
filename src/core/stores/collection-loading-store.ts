import { useMemo } from 'react'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import { shallow } from 'zustand/shallow'
import { useItems } from './scene-document-store'
import { AssetHttpError } from '../operations/stream-fetch'

// The three-free loading lifecycle for furniture collections, keyed by sourcePath:
// download progress, which are wanted on demand, and which have loaded or failed.
// It holds no three.js - the parsed objects live in the scene registry
// (collection-scene-registry) and the loader reports outcomes back here - and lives
// in core because its inputs and consumers are core/features. See
// docs/architecture/startup-and-asset-loading.md.

// Why a collection's load failed. 'unavailable' is permanent (a missing/broken
// asset, from a non-ok HTTP response) and is never retried; 'connection' is
// transient (network error or stall) and a re-request retries it.
export type CollectionLoadFailureKind = 'unavailable' | 'connection'

function classifyCollectionLoadError(
  error: unknown,
): CollectionLoadFailureKind {
  return error instanceof AssetHttpError ? 'unavailable' : 'connection'
}

export interface CollectionDownloadProgress {
  receivedBytes: number
  // Bytes expected from Content-Length, or 0 when the server does not send it.
  totalBytes: number
}

interface CollectionLoadingState {
  progressByPath: Map<string, CollectionDownloadProgress>
  // sourcePaths whose scene has parsed and registered. A three-free mirror of the
  // scene registry's keys, so core can await/observe loading without three.
  loaded: Set<string>
  // sourcePaths requested on demand (e.g. an add for a collection the restored
  // scene did not reference). Drives which on-demand collections the loader pulls
  // in; kept for the session so an added item's collection stays available.
  wanted: Set<string>
  // sourcePaths whose load failed, mapped to why. Not retried automatically;
  // re-requesting clears the mark and retries. 'unavailable' items are surfaced as
  // unavailable in the catalog and never auto-retried.
  failed: Map<string, CollectionLoadFailureKind>
}

const collectionLoadingStore = createStore<CollectionLoadingState>()(
  subscribeWithSelector(() => ({
    progressByPath: new Map<string, CollectionDownloadProgress>(),
    loaded: new Set<string>(),
    wanted: new Set<string>(),
    failed: new Map<string, CollectionLoadFailureKind>(),
  })),
)

export const collectionLoadingActions = {
  setProgress(path: string, progress: CollectionDownloadProgress) {
    collectionLoadingStore.setState((state) => {
      const progressByPath = new Map(state.progressByPath)
      progressByPath.set(path, progress)
      return { ...state, progressByPath }
    })
  },
  // Reported by the scene loader once a collection has parsed and registered. A
  // successful load also clears any prior failure mark.
  markLoaded(path: string) {
    collectionLoadingStore.setState((state) => {
      if (state.loaded.has(path) && !state.failed.has(path)) {
        return state
      }
      const loaded = new Set(state.loaded)
      loaded.add(path)
      const failed = new Map(state.failed)
      failed.delete(path)
      return { ...state, loaded, failed }
    })
  },
  // Reported by the scene loader when a collection fails to load; the raw error is
  // classified here (this layer owns the HTTP error type).
  markFailed(path: string, error: unknown) {
    const kind = classifyCollectionLoadError(error)
    collectionLoadingStore.setState((state) => {
      if (state.failed.get(path) === kind) {
        return state
      }
      const failed = new Map(state.failed)
      failed.set(path, kind)
      return { ...state, failed }
    })
  },
  // Request an on-demand collection (or re-request a failed one). Always writes a
  // fresh `wanted` set so useActiveOnDemandCollectionPaths recomputes and the
  // loader re-attempts, and clears any prior failure so the retry can proceed.
  requestCollection(path: string) {
    collectionLoadingStore.setState((state) => {
      const wanted = new Set(state.wanted)
      wanted.add(path)
      const failed = new Map(state.failed)
      failed.delete(path)
      return { ...state, wanted, failed }
    })
  },
  reset() {
    collectionLoadingStore.setState({
      progressByPath: new Map<string, CollectionDownloadProgress>(),
      loaded: new Set<string>(),
      wanted: new Set<string>(),
      failed: new Map<string, CollectionLoadFailureKind>(),
    })
  },
}

export function resetCollectionLoading() {
  collectionLoadingActions.reset()
}

export function isCollectionLoaded(path: string): boolean {
  return collectionLoadingStore.getState().loaded.has(path)
}

export function isCollectionFailed(path: string): boolean {
  return collectionLoadingStore.getState().failed.has(path)
}

export function getCollectionFailureKind(
  path: string,
): CollectionLoadFailureKind | null {
  return collectionLoadingStore.getState().failed.get(path) ?? null
}

// Reactive map of failed collections to why they failed, for the catalog to mark
// unavailable (permanent) items.
export function useFailedCollections(): Map<string, CollectionLoadFailureKind> {
  return useStoreWithEqualityFn(collectionLoadingStore, (state) => state.failed)
}

// Reactive set of loaded collection paths, for the startup readiness observer to
// tell when the gated collections have all parsed.
export function useLoadedCollections(): Set<string> {
  return useStoreWithEqualityFn(collectionLoadingStore, (state) => state.loaded)
}

// Requests a collection and resolves once the loader reports it loaded, or rejects
// if it fails - so the add flow surfaces an error instead of hanging. Settles off
// the store, so the caller never races a stale React render.
export function ensureCollectionLoaded(path: string): Promise<void> {
  if (isCollectionLoaded(path)) {
    return Promise.resolve()
  }

  collectionLoadingActions.requestCollection(path)

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (run: () => void) => {
      if (settled) {
        return
      }
      settled = true
      unsubscribe()
      run()
    }
    const unsubscribe = collectionLoadingStore.subscribe((state) => {
      if (state.loaded.has(path)) {
        finish(resolve)
      } else if (state.failed.has(path)) {
        finish(() => {
          reject(new Error(`furniture collection failed to load: ${path}`))
        })
      }
    })

    // Guard the window between the initial check and subscribing.
    if (isCollectionLoaded(path)) {
      finish(resolve)
    }
  })
}

// The on-demand collections the loader should pull in now: those referenced by a
// current scene item plus anything explicitly wanted, minus the gated set.
export function useActiveOnDemandCollectionPaths(
  gatedCollectionPaths: string[],
): string[] {
  const items = useItems()
  const wanted = useStoreWithEqualityFn(
    collectionLoadingStore,
    (state) => state.wanted,
  )

  return useMemo(() => {
    const gated = new Set(gatedCollectionPaths)
    const paths = new Set<string>()
    for (const item of items) {
      if (!gated.has(item.sourcePath)) {
        paths.add(item.sourcePath)
      }
    }
    for (const path of wanted) {
      if (!gated.has(path)) {
        paths.add(path)
      }
    }
    return [...paths]
  }, [items, wanted, gatedCollectionPaths])
}

// The download percent for one collection, or null when its size is unknown or it
// is not loading (so the Add button falls back to an indeterminate spinner).
export function useCollectionLoadPercent(path: string | null): number | null {
  return useStoreWithEqualityFn(collectionLoadingStore, (state) => {
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
  total: number
  loadedCount: number
  // Aggregate download percent (0-100) across the gated set.
  percent: number
}

// Aggregate download progress across the gated collections, for the startup
// loader. Computed at read time from the per-collection progress.
export function useGatedLoadProgress(gatedPaths: string[]): GatedLoadProgress {
  return useStoreWithEqualityFn(
    collectionLoadingStore,
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
