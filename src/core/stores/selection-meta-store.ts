import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { InteractionSource } from '../types/interaction.types'
import type { SceneOutlinerFocusRequest } from '../types/scene-panel.types'
import type { EqualityChecker } from '../types/store.types'

interface SelectionMetaStoreState {
  selectedSource: InteractionSource
  outlinerFocusRequest: SceneOutlinerFocusRequest | null
  roomViewFocusRequest: number | null
  setSelectedSource: (source: InteractionSource) => void
  requestOutlinerFocus: (request: SceneOutlinerFocusRequest) => void
  clearOutlinerFocusRequest: () => void
  requestRoomViewFocus: (token: number) => void
  clearRoomViewFocusRequest: () => void
  reset: () => void
}

function getInitialSelectionMetaState() {
  return {
    selectedSource: null,
    outlinerFocusRequest: null,
    roomViewFocusRequest: null,
  }
}

export const selectionMetaStore = createStore<SelectionMetaStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialSelectionMetaState(),
    setSelectedSource: (source) => {
      set((state) => {
        if (state.selectedSource === source) {
          return state
        }

        return {
          ...state,
          selectedSource: source,
        }
      })
    },
    requestOutlinerFocus: (request) => {
      set((state) => ({
        ...state,
        outlinerFocusRequest: request,
      }))
    },
    clearOutlinerFocusRequest: () => {
      set((state) => {
        if (state.outlinerFocusRequest === null) {
          return state
        }

        return {
          ...state,
          outlinerFocusRequest: null,
        }
      })
    },
    requestRoomViewFocus: (token) => {
      set((state) => ({
        ...state,
        roomViewFocusRequest: token,
      }))
    },
    clearRoomViewFocusRequest: () => {
      set((state) => {
        if (state.roomViewFocusRequest === null) {
          return state
        }

        return {
          ...state,
          roomViewFocusRequest: null,
        }
      })
    },
    reset: () => {
      set(() => ({
        ...getInitialSelectionMetaState(),
        setSelectedSource: get().setSelectedSource,
        requestOutlinerFocus: get().requestOutlinerFocus,
        clearOutlinerFocusRequest: get().clearOutlinerFocusRequest,
        requestRoomViewFocus: get().requestRoomViewFocus,
        clearRoomViewFocusRequest: get().clearRoomViewFocusRequest,
        reset: get().reset,
      }))
    },
  })),
)

function useSelectionMetaStore<T>(
  selector: (state: SelectionMetaStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(selectionMetaStore, selector, equalityFn)
}

export const selectionMetaActions = {
  setSelectedSource: (source: InteractionSource) => {
    selectionMetaStore.getState().setSelectedSource(source)
  },
  requestOutlinerFocus: (request: SceneOutlinerFocusRequest) => {
    selectionMetaStore.getState().requestOutlinerFocus(request)
  },
  clearOutlinerFocusRequest: () => {
    selectionMetaStore.getState().clearOutlinerFocusRequest()
  },
  requestRoomViewFocus: () => {
    selectionMetaStore.getState().requestRoomViewFocus(Date.now())
  },
  clearRoomViewFocusRequest: () => {
    selectionMetaStore.getState().clearRoomViewFocusRequest()
  },
  reset: () => {
    selectionMetaStore.getState().reset()
  },
}

export function resetSelectionMetaStore() {
  selectionMetaActions.reset()
}

export const useOutlinerFocusRequest = () =>
  useSelectionMetaStore((state) => state.outlinerFocusRequest)
export const useRoomViewFocusRequest = () =>
  useSelectionMetaStore((state) => state.roomViewFocusRequest)
