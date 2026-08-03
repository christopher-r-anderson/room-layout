import { shallow } from 'zustand/shallow'
import { sceneCommands } from '@/core/scene-commands'
import { resetCollectionSceneRegistry } from '@/core/stores/collection-scene-registry'
import {
  collectionLoadingActions,
  useCollectionLoadingStore,
  isCollectionFailed,
  isCollectionLoaded,
  resetCollectionLoadingStore,
} from '@/core/stores/collection-loading-store'
import { useEditorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  clearCollectionBytes,
  fetchCollectionBytes,
  releaseCollectionBytes,
} from './collection-bytes'
import { createReconciler } from './reconciler'

// The collection load pipeline, driven imperatively from core: fetch the bytes
// (shared byte source), have the scene parse and register them
// (sceneCommands.loadCollectionScene), then mark the outcome in the loading
// store. A store-driven reconciler kicks pending loads whenever their inputs
// change, so the chain never depends on React render timing. See
// docs/architecture/startup-and-asset-loading.md.

// In-flight paths, keyed to the startup cycle their load started in. A load
// whose cycle has passed (the retry teardown bumped it) discards its result
// instead of writing into the fresh cycle's stores, and does not block the
// fresh cycle from re-loading the same path.
const inFlight = new Map<string, number>()

function currentStartupCycle(): number {
  return useEditorLifecycleStore.getState().startupCycle
}

/**
 * Load one collection end-to-end. Idempotent per cycle: already loaded, marked
 * failed, or in flight for the current cycle is a no-op, and a not-ready scene
 * defers to the reconciler (which re-kicks once the scene mounts).
 */
export async function loadCollection(path: string): Promise<void> {
  if (
    isCollectionLoaded(path) ||
    isCollectionFailed(path) ||
    !sceneCommands.isSceneReady()
  ) {
    return
  }
  const cycle = currentStartupCycle()
  if (inFlight.get(path) === cycle) {
    return
  }
  inFlight.set(path, cycle)

  try {
    const bytes = await fetchCollectionBytes(path)
    // The retry teardown may have passed (cycle bump) or torn the scene down
    // while the bytes streamed; a stale cycle must not touch the fresh one.
    if (currentStartupCycle() !== cycle || !sceneCommands.isSceneReady()) {
      return
    }
    await sceneCommands.loadCollectionScene(path, bytes)
    if (currentStartupCycle() !== cycle) {
      // The parse itself cannot be cancelled, so the registry may briefly hold
      // an entry from a stale cycle; the fresh cycle re-parses and overwrites
      // it, and nothing consumes it before then because loaded is not marked.
      return
    }
    collectionLoadingActions.markLoaded(path)
  } catch (error) {
    if (currentStartupCycle() !== cycle) {
      return
    }
    collectionLoadingActions.markFailed(path, error)
    console.warn(`Failed to load furniture collection: ${path}`, error)
  } finally {
    if (currentStartupCycle() === cycle) {
      // The parsed scene (or the failure mark) supersedes the raw bytes.
      releaseCollectionBytes(path)
    }
    if (inFlight.get(path) === cycle) {
      inFlight.delete(path)
    }
  }
}

// Every collection that should be loaded now - the gated set plus the ones
// referenced by current items plus explicit requests - minus settled outcomes.
function resolvePendingCollectionPaths(): string[] {
  const { gated, wanted, loaded, failed } = useCollectionLoadingStore.getState()
  const paths = new Set<string>(gated ?? [])
  for (const item of useSceneDocumentStore.getState().history.present) {
    paths.add(item.sourcePath)
  }
  for (const path of wanted) {
    paths.add(path)
  }
  return [...paths].filter((path) => !loaded.has(path) && !failed.has(path))
}

function kickPendingCollectionLoads() {
  if (!useEditorLifecycleStore.getState().sceneReady) {
    return
  }
  for (const path of resolvePendingCollectionPaths()) {
    void loadCollection(path)
  }
}

/**
 * Starts the standing reconciler that keeps the loaded collections caught up
 * with what the editor needs: the scene mounting (initial load and every retry
 * remount), the gated set resolving, an item appearing, or an on-demand request
 * each kick the pending loads. Kicks are cheap and loadCollection is idempotent.
 */
export const startCollectionLoadReconciler = createReconciler(() => {
  const unsubscribes = [
    useEditorLifecycleStore.subscribe(
      (state) => state.sceneReady,
      kickPendingCollectionLoads,
    ),
    // Only the fields that decide which paths are pending - not progressByPath,
    // whose per-chunk updates would otherwise kick on every streamed chunk.
    useCollectionLoadingStore.subscribe(
      (state) => [state.gated, state.wanted, state.loaded, state.failed],
      kickPendingCollectionLoads,
      { equalityFn: shallow },
    ),
    useSceneDocumentStore.subscribe(
      (state) => state.history.present,
      kickPendingCollectionLoads,
    ),
  ]

  // Reconcile what already holds: the subscriptions only fire on future
  // updates, so state set before the reconciler started (a resolved gate, a
  // mounted scene) must be caught up here rather than waiting for the next
  // unrelated change.
  kickPendingCollectionLoads()

  return unsubscribes
})

/**
 * Tears down the whole collection pipeline for a fresh load cycle: the core
 * loading lifecycle, the scene's parsed-collection registry, and the buffered
 * bytes must reset together or the mirrored loaded state drifts.
 */
export function resetCollectionPipeline() {
  resetCollectionLoadingStore()
  resetCollectionSceneRegistry()
  clearCollectionBytes()
}

/**
 * Requests a collection and resolves once it is loaded, or rejects if it fails -
 * so the add flow surfaces an error instead of hanging. Kicks the load directly
 * (no React in the chain) and settles off the store, so concurrent requests for
 * the same path share one outcome.
 */
export function ensureCollectionLoaded(path: string): Promise<void> {
  if (isCollectionLoaded(path)) {
    return Promise.resolve()
  }

  // Re-requesting clears a transient failure mark so the load below retries.
  collectionLoadingActions.requestCollection(path)
  void loadCollection(path)

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
    const rejectFailed = () => {
      reject(new Error(`furniture collection failed to load: ${path}`))
    }
    const unsubscribe = useCollectionLoadingStore.subscribe(
      (state) => ({
        loaded: state.loaded.has(path),
        failed: state.failed.has(path),
        wanted: state.wanted.has(path),
      }),
      ({ loaded, failed, wanted }) => {
        if (loaded) {
          finish(resolve)
        } else if (failed) {
          finish(rejectFailed)
        } else if (!wanted) {
          // Only the retry teardown removes a requested path from `wanted`,
          // and the in-flight load discards its result on the cycle guard -
          // reject instead of leaking the subscription and hanging the caller.
          finish(() => {
            reject(new Error(`furniture collection load was reset: ${path}`))
          })
        }
      },
      { equalityFn: shallow },
    )

    // Settle states that already hold: a load that won the window between the
    // initial check and subscribing, or a preserved permanent failure (which
    // requestCollection deliberately does not clear, so no store change will
    // fire the subscription).
    if (isCollectionLoaded(path)) {
      finish(resolve)
    } else if (isCollectionFailed(path)) {
      finish(rejectFailed)
    }
  })
}
