import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { StartupErrorKind } from '../types/startup.types'
import type { EqualityChecker } from '../types/store.types'

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
  markAssetsReady: () => void
  beginAssetLoad: () => void
  requestRetry: () => void
  setAssetError: (error: EditorAssetError) => void
  recordRestoreOutcome: (outcome: RestoreOutcome | null) => void
  incrementRestoreAttempt: () => void
  reset: () => void
}

const INITIAL_EDITOR_LIFECYCLE_STATE = {
  startupPhase: 'loading' as const,
  assetError: null,
  restoreOutcome: null,
  restoreAttemptCount: 0,
  sceneEpoch: 0,
  retryToken: 0,
}

function getInitialEditorLifecycleState() {
  return {
    ...INITIAL_EDITOR_LIFECYCLE_STATE,
  }
}

export const editorLifecycleStore = createStore<EditorLifecycleStoreState>()(
  subscribeWithSelector((set) => ({
    ...getInitialEditorLifecycleState(),
    markAssetsReady: () => {
      set((state) => {
        if (state.startupPhase === 'ready' && state.assetError === null) {
          return state
        }

        return {
          ...state,
          startupPhase: 'ready',
          assetError: null,
        }
      })
    },
    beginAssetLoad: () => {
      // A manifest has arrived; start a fresh asset-load cycle. Bumping the
      // scene epoch forces the Scene to remount and reload GLTFs.
      set((state) => ({
        ...state,
        startupPhase: 'loading',
        assetError: null,
        sceneEpoch: state.sceneEpoch + 1,
      }))
    },
    requestRetry: () => {
      // Re-run startup from the manifest fetch. The retry token re-triggers the
      // bootstrap fetch effect; the scene epoch remounts the Scene. Restore
      // tracking is preserved so the one-time restore flow does not re-run.
      set((state) => ({
        ...state,
        startupPhase: 'loading',
        assetError: null,
        sceneEpoch: state.sceneEpoch + 1,
        retryToken: state.retryToken + 1,
      }))
    },
    setAssetError: (error) => {
      set((state) => {
        if (
          state.startupPhase === 'errored' &&
          state.assetError?.kind === error.kind &&
          state.assetError.message === error.message
        ) {
          return state
        }

        return {
          ...state,
          startupPhase: 'errored',
          assetError: error,
        }
      })
    },
    recordRestoreOutcome: (outcome) => {
      set((state) => {
        if (state.restoreOutcome === outcome) {
          return state
        }

        return {
          ...state,
          restoreOutcome: outcome,
        }
      })
    },
    incrementRestoreAttempt: () => {
      set((state) => ({
        ...state,
        restoreAttemptCount: state.restoreAttemptCount + 1,
      }))
    },
    reset: () => {
      set((state) => ({
        ...state,
        ...getInitialEditorLifecycleState(),
      }))
    },
  })),
)

function useEditorLifecycleStore<T>(
  selector: (state: EditorLifecycleStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(editorLifecycleStore, selector, equalityFn)
}

export const editorLifecycleActions = {
  markAssetsReady: () => {
    editorLifecycleStore.getState().markAssetsReady()
  },
  beginAssetLoad: () => {
    editorLifecycleStore.getState().beginAssetLoad()
  },
  requestRetry: () => {
    editorLifecycleStore.getState().requestRetry()
  },
  setAssetError: (error: EditorAssetError) => {
    editorLifecycleStore.getState().setAssetError(error)
  },
  recordRestoreOutcome: (outcome: RestoreOutcome | null) => {
    editorLifecycleStore.getState().recordRestoreOutcome(outcome)
  },
  incrementRestoreAttempt: () => {
    editorLifecycleStore.getState().incrementRestoreAttempt()
  },
  reset: () => {
    editorLifecycleStore.getState().reset()
  },
}

export function resetEditorLifecycleStore() {
  editorLifecycleActions.reset()
}

// Imperative (non-React) read of whether the editor is interactive: startup has
// finished and assets are ready. The single predicate operations gate on, so the
// readiness rule lives in one place instead of being re-derived from the store
// internals at every call site. The React equivalent is useEditorInteractionsEnabled.
export function isEditorInteractive() {
  return editorLifecycleStore.getState().startupPhase === 'ready'
}

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
