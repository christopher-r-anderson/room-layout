import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import {
  AssetHttpError,
  type StreamFetchProgress,
} from '@/core/operations/stream-fetch'

// The three-free loading lifecycle for furniture collections, keyed by sourcePath:
// the gated set, download progress, which are wanted on demand, and which have
// loaded or failed. It holds no three.js - the parsed objects live in the scene
// registry (collection-scene-registry) and the load pipeline
// (operations/collection-loader) reports outcomes back here. See
// docs/architecture/startup-and-asset-loading.md.

// Why a collection's load failed. 'unavailable' is permanent (a missing, broken,
// or unparseable asset) and is never retried; 'connection' is transient (network
// error or stall) and a re-request retries it.
export type CollectionLoadFailureKind = 'unavailable' | 'connection'

function classifyCollectionLoadError(
  error: unknown,
): CollectionLoadFailureKind {
  if (error instanceof AssetHttpError) {
    return 'unavailable'
  }
  // Transport-level failures: fetch rejects with a TypeError on a network error
  // and with a DOMException (AbortError / TimeoutError) on an abort or stall.
  if (error instanceof DOMException || error instanceof TypeError) {
    return 'connection'
  }
  // Anything else failed after the bytes arrived (e.g. GLB parse), so retrying
  // the download cannot help - treat it as permanent.
  return 'unavailable'
}

// The store's progress entries are exactly what streamFetch reports.
export type CollectionDownloadProgress = StreamFetchProgress

interface CollectionLoadingState {
  // The gated set: the collections the restored scene references, which startup
  // must load before the editor unlocks (empty for a fresh scene; everything else
  // loads on demand). null until bootstrap resolves it from the manifest - the
  // readiness observer treats null as "not knowable yet", so a retry (which
  // resets it) cannot complete against a stale gate.
  gated: string[] | null
  progressByPath: Map<string, CollectionDownloadProgress>
  // sourcePaths whose scene has parsed and registered. A three-free mirror of the
  // scene registry's keys, so core can await/observe loading without three.
  loaded: Set<string>
  // sourcePaths requested on demand (e.g. an add for a collection the restored
  // scene did not reference). Drives which on-demand collections the loader pulls
  // in; kept for the session so an added item's collection stays available.
  wanted: Set<string>
  // sourcePaths whose load failed, mapped to why. Not retried automatically;
  // re-requesting clears a transient 'connection' mark and retries, while
  // 'unavailable' items are surfaced as unavailable in the catalog and keep
  // their mark until an explicit startup retry resets everything.
  failed: Map<string, CollectionLoadFailureKind>
}

// getInitialState() hands back the first result of this factory on reset, so the
// Maps/Sets it creates must never be mutated in place - every action copies on
// write.
function createInitialCollectionLoadingState(): CollectionLoadingState {
  return {
    gated: null,
    progressByPath: new Map<string, CollectionDownloadProgress>(),
    loaded: new Set<string>(),
    wanted: new Set<string>(),
    failed: new Map<string, CollectionLoadFailureKind>(),
  }
}

// Exported for the non-React load pipeline (operations/collection-loader), which
// subscribes for its reconciler and settles ensureCollectionLoaded off store
// changes. React consumers use the selector hooks below.
export const useCollectionLoadingStore = create<CollectionLoadingState>()(
  subscribeWithSelector(() => createInitialCollectionLoadingState()),
)

export const collectionLoadingActions = {
  // Resolved once per load cycle by bootstrap, after the manifest arrives.
  setGatedCollectionPaths: (paths: string[]) => {
    useCollectionLoadingStore.setState({ gated: paths })
  },
  setProgress: (path: string, progress: CollectionDownloadProgress) => {
    useCollectionLoadingStore.setState((state) => {
      const progressByPath = new Map(state.progressByPath)
      progressByPath.set(path, progress)
      return { progressByPath }
    })
  },
  // Reported by the load pipeline once a collection has parsed and registered. A
  // successful load also clears any prior failure mark.
  markLoaded: (path: string) => {
    useCollectionLoadingStore.setState((state) => {
      if (state.loaded.has(path) && !state.failed.has(path)) {
        return state
      }
      const loaded = new Set(state.loaded)
      loaded.add(path)
      const failed = new Map(state.failed)
      failed.delete(path)
      return { loaded, failed }
    })
  },
  // Reported by the load pipeline when a collection fails to load; the raw error
  // is classified here (this layer owns the HTTP error type).
  markFailed: (path: string, error: unknown) => {
    const kind = classifyCollectionLoadError(error)
    useCollectionLoadingStore.setState((state) => {
      if (state.failed.get(path) === kind) {
        return state
      }
      const failed = new Map(state.failed)
      failed.set(path, kind)
      return { failed }
    })
  },
  // Request an on-demand collection (or re-request a failed one). Always writes a
  // fresh `wanted` set so the load reconciler is notified even for a re-request.
  // Only a transient `connection` failure is cleared for the retry: an
  // `unavailable` mark is permanent for the session (re-requesting a missing or
  // broken asset cannot help, and clearing it would flicker its catalog tile
  // back to selectable); only an explicit startup retry resets it.
  requestCollection: (path: string) => {
    useCollectionLoadingStore.setState((state) => {
      const wanted = new Set(state.wanted)
      wanted.add(path)
      const failed = new Map(state.failed)
      if (failed.get(path) === 'connection') {
        failed.delete(path)
      }
      return { wanted, failed }
    })
  },
  reset: () => {
    useCollectionLoadingStore.setState(
      useCollectionLoadingStore.getInitialState(),
      true,
    )
  },
}

export function resetCollectionLoadingStore() {
  collectionLoadingActions.reset()
}

function clampPercent(receivedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, (receivedBytes / totalBytes) * 100))
}

export function isCollectionLoaded(path: string): boolean {
  return useCollectionLoadingStore.getState().loaded.has(path)
}

export function isCollectionFailed(path: string): boolean {
  return useCollectionLoadingStore.getState().failed.has(path)
}

export function getCollectionFailureKind(
  path: string,
): CollectionLoadFailureKind | null {
  return useCollectionLoadingStore.getState().failed.get(path) ?? null
}

// Reactive map of failed collections to why they failed, for the catalog to mark
// unavailable (permanent) items.
export function useFailedCollections(): Map<string, CollectionLoadFailureKind> {
  return useCollectionLoadingStore((state) => state.failed)
}

// Reactive set of loaded collection paths, for the startup readiness observer to
// tell when the gated collections have all parsed.
export function useLoadedCollections(): Set<string> {
  return useCollectionLoadingStore((state) => state.loaded)
}

const NO_GATED_PATHS: string[] = []

// The gated set, or [] while bootstrap has not resolved it yet. Use
// useGatedCollectionsResolved to distinguish "resolved to empty" from "unknown".
export function useGatedCollectionPaths(): string[] {
  return (
    useCollectionLoadingStore(useShallow((state) => state.gated)) ??
    NO_GATED_PATHS
  )
}

// Whether bootstrap has resolved the gated set for the current load cycle. The
// readiness observer gates on this rather than on a proxy such as manifest
// contents, so an unresolved (or reset-by-retry) gate can never read as ready.
export function useGatedCollectionsResolved(): boolean {
  return useCollectionLoadingStore((state) => state.gated !== null)
}

// The download percent for one collection, or null when its size is unknown or it
// is not loading (so the Add button falls back to an indeterminate spinner).
export function useCollectionLoadPercent(path: string | null): number | null {
  return useCollectionLoadingStore((state) => {
    if (!path) {
      return null
    }
    const progress = state.progressByPath.get(path)
    if (!progress || progress.totalBytes <= 0) {
      return null
    }
    return Math.round(clampPercent(progress.receivedBytes, progress.totalBytes))
  })
}

export interface GatedLoadProgress {
  total: number
  loadedCount: number
  // Aggregate download percent (0-100) across the gated set.
  percent: number
}

// Aggregate download progress across the gated collections, for the startup
// loader. Computed at read time from the per-collection progress. The percent
// only aggregates collections with a known Content-Length (unknown sizes would
// skew the denominator); a parsed collection always counts as byte-complete, so
// a missing Content-Length cannot pin the loader in its downloading stage.
export function useGatedLoadProgress(): GatedLoadProgress {
  return useCollectionLoadingStore(
    useShallow((state) => {
      const gatedPaths = state.gated ?? NO_GATED_PATHS
      let receivedBytes = 0
      let totalBytes = 0
      let loadedCount = 0
      for (const path of gatedPaths) {
        const progress = state.progressByPath.get(path)
        const hasKnownSize = progress !== undefined && progress.totalBytes > 0
        if (hasKnownSize) {
          receivedBytes += Math.min(progress.receivedBytes, progress.totalBytes)
          totalBytes += progress.totalBytes
        }
        if (
          state.loaded.has(path) ||
          (hasKnownSize && progress.receivedBytes >= progress.totalBytes)
        ) {
          loadedCount += 1
        }
      }
      const percent = clampPercent(receivedBytes, totalBytes)
      return { total: gatedPaths.length, loadedCount, percent }
    }),
  )
}
