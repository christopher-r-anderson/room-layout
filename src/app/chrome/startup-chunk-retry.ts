import { useEditorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { notifyChunkLoadError } from '@/core/operations/startup-coordinator'

// Recovery for the app's own lazy chunks (engine, chrome). A failed chunk fetch
// (stale deploy, dropped connection) must surface the startup error + retry
// rather than crash the tree - and React.lazy caches a rejected factory for the
// component's lifetime, so the factory returned here never rejects: it reports
// the failure and turns the retry into a full reload. A reload (not a
// re-import) because the browser may cache the failed module fetch, and after a
// stale deploy the old hashed URL is gone regardless - only re-reading
// index.html picks up the fresh chunk graph.

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
