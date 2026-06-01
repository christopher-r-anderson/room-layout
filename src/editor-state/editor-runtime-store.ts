import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { StartupErrorKind } from '@/app/startup/use-startup-state'
import type { EqualityChecker } from './store-types'

export type RestoreOutcome = 'restored' | 'invalid' | 'skipped'

export type EditorStartupPhase = 'loading' | 'ready' | 'errored'

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
  markLoading: () => void
  markAssetsReady: () => void
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

export function useEditorRuntimeStore<T>(
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
export const useEditorInteractionsEnabled = () =>
  useEditorRuntimeStore((state) => state.startupPhase === 'ready')
export const useStartupOverlayActive = () =>
  useEditorRuntimeStore((state) => state.startupPhase !== 'ready')
export const useStartupLoadingActive = () =>
  useEditorRuntimeStore((state) => state.startupPhase === 'loading')
