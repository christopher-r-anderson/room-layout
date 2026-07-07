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
  sceneEpoch: number
  retryToken: number
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
      sceneEpoch: 0,
      retryToken: 0,
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
      // A manifest has arrived; start a fresh asset-load cycle. Bumping the
      // scene epoch remounts the Scene and the collection loader.
      return {
        startupPhase: 'loading',
        assetError: null,
        sceneEpoch: state.sceneEpoch + 1,
      }
    })
  },
  requestRetry: () => {
    // Re-run startup from the manifest fetch. The retry token re-triggers the
    // bootstrap fetch effect; the scene epoch remounts the Scene. Restore
    // tracking resets with the cycle: the error path wiped the document, so
    // the restore flow must re-run at ready to bring the draft back (leaving
    // it to unlock empty would also make draft persistence clear the saved
    // draft as an at-defaults scene).
    useEditorLifecycleStore.setState((state) => ({
      startupPhase: 'loading',
      assetError: null,
      restoreOutcome: null,
      restoreAttemptCount: 0,
      sceneEpoch: state.sceneEpoch + 1,
      retryToken: state.retryToken + 1,
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

// Imperative (non-React) editor-interactive predicate, so the readiness rule lives
// in one place. React equivalent: useEditorInteractionsEnabled.
export function isEditorInteractive() {
  return useEditorLifecycleStore.getState().startupPhase === 'ready'
}

export const useSceneReady = () =>
  useEditorLifecycleStore((state) => state.sceneReady)
export const useStartupPhase = () =>
  useEditorLifecycleStore((state) => state.startupPhase)
export const useAssetError = () =>
  useEditorLifecycleStore((state) => state.assetError)
export const useSceneEpoch = () =>
  useEditorLifecycleStore((state) => state.sceneEpoch)
export const useRetryToken = () =>
  useEditorLifecycleStore((state) => state.retryToken)
export const useEditorInteractionsEnabled = () =>
  useEditorLifecycleStore((state) => state.startupPhase === 'ready')
export const useStartupOverlayActive = () =>
  useEditorLifecycleStore((state) => state.startupPhase !== 'ready')
export const useStartupLoadingActive = () =>
  useEditorLifecycleStore((state) => state.startupPhase === 'loading')
