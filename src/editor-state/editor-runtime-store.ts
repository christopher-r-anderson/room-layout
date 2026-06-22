import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { StartupErrorKind } from './types/startup.types'
import type { EqualityChecker } from './store-types'

export type RestoreOutcome = 'restored' | 'invalid' | 'skipped'

type EditorStartupPhase = 'loading' | 'ready' | 'errored'

export interface EditorAssetError {
  kind: StartupErrorKind
  message: string
}

interface EditorRuntimeStoreState {
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
  resetEditorRuntime: () => void
  reset: () => void
}

const INITIAL_EDITOR_RUNTIME_STATE = {
  startupPhase: 'loading' as const,
  assetError: null,
  restoreOutcome: null,
  restoreAttemptCount: 0,
  floorFinishLoading: false,
  sceneEpoch: 0,
  retryToken: 0,
}

function getInitialEditorRuntimeState() {
  return {
    ...INITIAL_EDITOR_RUNTIME_STATE,
  }
}

export const editorRuntimeStore = createStore<EditorRuntimeStoreState>()(
  subscribeWithSelector((set) => ({
    ...getInitialEditorRuntimeState(),
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
    resetEditorRuntime: () => {
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
        ...getInitialEditorRuntimeState(),
      }))
    },
  })),
)

function useEditorRuntimeStore<T>(
  selector: (state: EditorRuntimeStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(editorRuntimeStore, selector, equalityFn)
}

export const editorRuntimeActions = {
  markLoading: () => {
    editorRuntimeStore.getState().markLoading()
  },
  markAssetsReady: () => {
    editorRuntimeStore.getState().markAssetsReady()
  },
  beginAssetLoad: () => {
    editorRuntimeStore.getState().beginAssetLoad()
  },
  requestRetry: () => {
    editorRuntimeStore.getState().requestRetry()
  },
  setAssetError: (error: EditorAssetError) => {
    editorRuntimeStore.getState().setAssetError(error)
  },
  clearAssetError: () => {
    editorRuntimeStore.getState().clearAssetError()
  },
  recordRestoreOutcome: (outcome: RestoreOutcome | null) => {
    editorRuntimeStore.getState().recordRestoreOutcome(outcome)
  },
  incrementRestoreAttempt: () => {
    editorRuntimeStore.getState().incrementRestoreAttempt()
  },
  setFloorFinishLoading: (loading: boolean) => {
    editorRuntimeStore.getState().setFloorFinishLoading(loading)
  },
  resetEditorRuntime: () => {
    editorRuntimeStore.getState().resetEditorRuntime()
  },
  reset: () => {
    editorRuntimeStore.getState().reset()
  },
}

export function resetEditorRuntimeStore() {
  editorRuntimeActions.reset()
}

export const useStartupPhase = () =>
  useEditorRuntimeStore((state) => state.startupPhase)
export const useAssetError = () =>
  useEditorRuntimeStore((state) => state.assetError)
export const useRestoreOutcome = () =>
  useEditorRuntimeStore((state) => state.restoreOutcome)
export const useRestoreAttemptCount = () =>
  useEditorRuntimeStore((state) => state.restoreAttemptCount)
export const useFloorFinishLoading = () =>
  useEditorRuntimeStore((state) => state.floorFinishLoading)
export const useSceneEpoch = () =>
  useEditorRuntimeStore((state) => state.sceneEpoch)
export const useRetryToken = () =>
  useEditorRuntimeStore((state) => state.retryToken)
export const useEditorInteractionsEnabled = () =>
  useEditorRuntimeStore((state) => state.startupPhase === 'ready')
export const useStartupOverlayActive = () =>
  useEditorRuntimeStore((state) => state.startupPhase !== 'ready')
export const useStartupLoadingActive = () =>
  useEditorRuntimeStore((state) => state.startupPhase === 'loading')
