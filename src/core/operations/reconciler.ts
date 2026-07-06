/**
 * Wraps a standing reconciler's lifecycle: the returned start function is
 * idempotent (repeated calls reuse the active subscription) and returns a stop
 * that runs every cleanup the setup produced, after which the reconciler can be
 * started fresh.
 */
export function createReconciler(
  setup: () => (() => void)[],
): () => () => void {
  let activeStop: (() => void) | null = null

  return function start() {
    if (activeStop) {
      return activeStop
    }

    const cleanups = setup()

    activeStop = () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
      activeStop = null
    }

    return activeStop
  }
}
