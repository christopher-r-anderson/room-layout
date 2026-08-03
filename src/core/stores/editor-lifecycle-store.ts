import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type StartupErrorKind =
  | 'manifest-timeout'
  | 'manifest-network'
  | 'manifest-validation'
  | 'asset-load'
  | 'app-chunk'

export type RestoreOutcome = 'restored' | 'invalid' | 'skipped'

type EditorStartupPhase = 'loading' | 'ready' | 'errored'

export interface EditorAssetError {
  kind: StartupErrorKind
  message: string
}

interface EditorLifecycleStoreState {
  startupPhase: EditorStartupPhase
  assetError: EditorAssetError | null
  restoreOutcome: RestoreOutcome | null
  restoreAttemptCount: number
  // Which startup cycle this is. Bumps ONLY in requestRetry - i.e. only on an
  // explicit user retry - and three consumers rely on exactly that invariant:
  // the scene-canvas key (one Scene remount per retry), the collection
  // loader's stale-cycle guard, and startup-chunk-retry (a bump IS "the next
  // explicit retry", when it reloads the page).
  startupCycle: number
  // Whether the scene services are live. Single producer: registerSceneServices/
  // clearSceneServices (core/scene-services), so this flag and isSceneReady()
  // answer from the same oracle. The startup readiness observer gates on it so
  // the loading overlay never lifts before the scene is up.
  sceneReady: boolean
}

export const useEditorLifecycleStore = create<EditorLifecycleStoreState>()(
  subscribeWithSelector(
    (): EditorLifecycleStoreState => ({
      startupPhase: 'loading',
      assetError: null,
      restoreOutcome: null,
      restoreAttemptCount: 0,
      startupCycle: 0,
      sceneReady: false,
    }),
  ),
)

export const editorLifecycleActions = {
  markAssetsReady: () => {
    useEditorLifecycleStore.setState((state) =>
      state.startupPhase === 'ready' && state.assetError === null
        ? state
        : { startupPhase: 'ready', assetError: null },
    )
  },
  beginAssetLoad: () => {
    useEditorLifecycleStore.setState((state) => {
      // An error that surfaced since this cycle began (e.g. a failed engine
      // chunk fetch racing the manifest fetch) holds until an explicit
      // retry; a late manifest success must not clear it and strand the
      // loader.
      if (state.startupPhase === 'errored') {
        return state
      }
      // A manifest has arrived; the asset-load half of the cycle begins. The
      // mounted Scene picks the manifest up through props, so this does not
      // bump the cycle (only an explicit retry remounts).
      return {
        startupPhase: 'loading',
        assetError: null,
      }
    })
  },
  requestRetry: () => {
    // The cycle bump remounts the Scene and invalidates in-flight collection
    // loads. Restore tracking resets with it: the error path wiped the
    // document, so restore must re-run at ready or the draft would be lost
    // (and then cleared as an at-defaults scene).
    useEditorLifecycleStore.setState((state) => ({
      startupPhase: 'loading',
      assetError: null,
      restoreOutcome: null,
      restoreAttemptCount: 0,
      startupCycle: state.startupCycle + 1,
    }))
  },
  setAssetError: (error: EditorAssetError) => {
    useEditorLifecycleStore.setState((state) =>
      state.startupPhase === 'errored' &&
      state.assetError?.kind === error.kind &&
      state.assetError.message === error.message
        ? state
        : { startupPhase: 'errored', assetError: error },
    )
  },
  setSceneReady: (ready: boolean) => {
    useEditorLifecycleStore.setState((state) =>
      state.sceneReady === ready ? state : { sceneReady: ready },
    )
  },
  recordRestoreOutcome: (outcome: RestoreOutcome | null) => {
    useEditorLifecycleStore.setState((state) =>
      state.restoreOutcome === outcome ? state : { restoreOutcome: outcome },
    )
  },
  incrementRestoreAttempt: () => {
    useEditorLifecycleStore.setState((state) => ({
      restoreAttemptCount: state.restoreAttemptCount + 1,
    }))
  },
  reset: () => {
    useEditorLifecycleStore.setState(
      {
        ...useEditorLifecycleStore.getInitialState(),
        // sceneReady mirrors the scene-services registry, which this store
        // does not own; resetting it here would detach the flag from the
        // registry it reflects. It only moves via register/clear.
        sceneReady: useEditorLifecycleStore.getState().sceneReady,
      },
      true,
    )
  },
}

export function resetEditorLifecycleStore() {
  editorLifecycleActions.reset()
}

/**
 * Imperative (non-React) editor-interactive predicate, so the readiness rule lives
 * in one place. React equivalent: useEditorInteractionsEnabled.
 */
export function isEditorInteractive() {
  return useEditorLifecycleStore.getState().startupPhase === 'ready'
}

export const useSceneReady = () =>
  useEditorLifecycleStore((state) => state.sceneReady)
export const useStartupPhase = () =>
  useEditorLifecycleStore((state) => state.startupPhase)
export const useAssetError = () =>
  useEditorLifecycleStore((state) => state.assetError)
export const useStartupCycle = () =>
  useEditorLifecycleStore((state) => state.startupCycle)
export const useEditorInteractionsEnabled = () =>
  useEditorLifecycleStore((state) => state.startupPhase === 'ready')
export const useStartupOverlayActive = () =>
  useEditorLifecycleStore((state) => state.startupPhase !== 'ready')
export const useStartupLoadingActive = () =>
  useEditorLifecycleStore((state) => state.startupPhase === 'loading')
