import { useEditorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { notifyChunkLoadError } from '@/core/operations/startup-coordinator'

// React.lazy caches a rejected factory for the component's lifetime, so the
// factory returned here never rejects: it reports the failure and turns the
// retry into a full reload. A reload (not a re-import) because the old hashed
// URL may be gone after a stale deploy - only re-reading index.html picks up
// the fresh chunk graph.

// Resolves on the next explicit startup retry (the cycle bumps only then).
function nextRetryRequest(): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = useEditorLifecycleStore.subscribe(
      (state) => state.startupCycle,
      () => {
        unsubscribe()
        resolve()
      },
    )
  })
}

export function withStartupChunkRetry<T>(
  load: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    try {
      return await load()
    } catch (error) {
      notifyChunkLoadError(
        error instanceof Error ? error : new Error(String(error)),
      )
      await nextRetryRequest()
      window.location.reload()
      // Keep the factory pending while the reload tears the page down.
      return new Promise<never>(() => undefined)
    }
  }
}
