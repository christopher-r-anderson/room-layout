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
  floorFinishLoading: boolean
  sceneEpoch: number
  retryToken: number
  markLoading: () => void
  markAssetsReady: () => void
  beginAssetLoad: () => void
  requestRetry: () => void
  setAssetError: (error: EditorAssetError) => void
  clearAssetError: () => void
  recordRestoreOutcome: (outcome: RestoreOutcome | null) => void
  incrementRestoreAttempt: () => void
  setFloorFinishLoading: (loading: boolean) => void
  resetEditorLifecycle: () => void
  reset: () => void
}

const INITIAL_EDITOR_LIFECYCLE_STATE = {
  startupPhase: 'loading' as const,
  assetError: null,
  restoreOutcome: null,
  restoreAttemptCount: 0,
  floorFinishLoading: false,
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
    markLoading: () => {
      set((state) => {
        if (state.startupPhase === 'loading' && state.assetError === null) {
          return state
        }

        return {
          ...state,
          startupPhase: 'loading',
          assetError: null,
        }
      })
    },
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
        floorFinishLoading: false,
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
    clearAssetError: () => {
      set((state) => {
        if (state.assetError === null) {
          return state
        }

        return {
          ...state,
          assetError: null,
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
    setFloorFinishLoading: (loading) => {
      set((state) => {
        if (state.floorFinishLoading === loading) {
          return state
        }

        return {
          ...state,
          floorFinishLoading: loading,
        }
      })
    },
    resetEditorLifecycle: () => {
      set((state) => {
        if (
          state.startupPhase === 'loading' &&
          state.assetError === null &&
          !state.floorFinishLoading
        ) {
          return state
        }

        return {
          ...state,
          startupPhase: 'loading',
          assetError: null,
          floorFinishLoading: false,
        }
      })
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
  markLoading: () => {
    editorLifecycleStore.getState().markLoading()
  },
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
  clearAssetError: () => {
    editorLifecycleStore.getState().clearAssetError()
  },
  recordRestoreOutcome: (outcome: RestoreOutcome | null) => {
    editorLifecycleStore.getState().recordRestoreOutcome(outcome)
  },
  incrementRestoreAttempt: () => {
    editorLifecycleStore.getState().incrementRestoreAttempt()
  },
  setFloorFinishLoading: (loading: boolean) => {
    editorLifecycleStore.getState().setFloorFinishLoading(loading)
  },
  resetEditorLifecycle: () => {
    editorLifecycleStore.getState().resetEditorLifecycle()
  },
  reset: () => {
    editorLifecycleStore.getState().reset()
  },
}

export function resetEditorLifecycleStore() {
  editorLifecycleActions.reset()
}

export const useStartupPhase = () =>
  useEditorLifecycleStore((state) => state.startupPhase)
export const useAssetError = () =>
  useEditorLifecycleStore((state) => state.assetError)
export const useRestoreOutcome = () =>
  useEditorLifecycleStore((state) => state.restoreOutcome)
export const useRestoreAttemptCount = () =>
  useEditorLifecycleStore((state) => state.restoreAttemptCount)
export const useFloorFinishLoading = () =>
  useEditorLifecycleStore((state) => state.floorFinishLoading)
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
