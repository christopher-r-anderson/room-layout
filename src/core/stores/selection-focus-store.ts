import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { InteractionSource } from '../types/interaction.types'
import type { OutlinerFocusRequest } from '../types/outliner.types'
import type { EqualityChecker } from '../types/store.types'

// View-side routing that reacts to selection: how the selection was made
// (`selectedSource`, read to decide where focus lands after a delete) and where
// focus should be sent (outliner / room-view focus requests). The selection
// pointer itself lives in scene-document-store; this store is the presentation
// overlay reconciled on top of it.
interface SelectionFocusStoreState {
  selectedSource: InteractionSource
  outlinerFocusRequest: OutlinerFocusRequest | null
  roomViewFocusRequest: number | null
  setSelectedSource: (source: InteractionSource) => void
  requestOutlinerFocus: (request: OutlinerFocusRequest) => void
  clearOutlinerFocusRequest: () => void
  requestRoomViewFocus: (token: number) => void
  clearRoomViewFocusRequest: () => void
  reset: () => void
}

function getInitialSelectionFocusState() {
  return {
    selectedSource: null,
    outlinerFocusRequest: null,
    roomViewFocusRequest: null,
  }
}

export const selectionFocusStore = createStore<SelectionFocusStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialSelectionFocusState(),
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
        ...getInitialSelectionFocusState(),
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

function useSelectionFocusStore<T>(
  selector: (state: SelectionFocusStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(selectionFocusStore, selector, equalityFn)
}

export const selectionFocusActions = {
  setSelectedSource: (source: InteractionSource) => {
    selectionFocusStore.getState().setSelectedSource(source)
  },
  requestOutlinerFocus: (request: OutlinerFocusRequest) => {
    selectionFocusStore.getState().requestOutlinerFocus(request)
  },
  clearOutlinerFocusRequest: () => {
    selectionFocusStore.getState().clearOutlinerFocusRequest()
  },
  requestRoomViewFocus: () => {
    selectionFocusStore.getState().requestRoomViewFocus(Date.now())
  },
  clearRoomViewFocusRequest: () => {
    selectionFocusStore.getState().clearRoomViewFocusRequest()
  },
  reset: () => {
    selectionFocusStore.getState().reset()
  },
}

export function resetSelectionFocusStore() {
  selectionFocusActions.reset()
}

export const useOutlinerFocusRequest = () =>
  useSelectionFocusStore((state) => state.outlinerFocusRequest)
export const useRoomViewFocusRequest = () =>
  useSelectionFocusStore((state) => state.roomViewFocusRequest)
