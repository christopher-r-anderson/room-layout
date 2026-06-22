import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type { HistoryAvailability } from './types/history.types'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { EqualityChecker } from './store-types'

interface SceneStateStoreState {
  history: HistoryState<FurnitureItem[]>
  instanceIdCounter: number
  selectedId: string | null
  previewedIdRaw: string | null
  historyAvailability: HistoryAvailability
  isDragging: boolean
  floorFinishId: string
  wallFinishId: string
  editorMessage: string | null
  setHistory: (history: HistoryState<FurnitureItem[]>) => void
  updateHistory: (
    updater: (
      history: HistoryState<FurnitureItem[]>,
    ) => HistoryState<FurnitureItem[]>,
  ) => void
  setInstanceIdCounter: (counter: number) => void
  setSelectedId: (id: string | null) => void
  setPreviewedId: (id: string | null) => void
  setDragging: (dragging: boolean) => void
  setFloorFinishId: (id: string) => void
  setWallFinishId: (id: string) => void
  setEditorMessage: (message: string | null) => void
  clearEditorMessage: () => void
  resetSceneState: () => void
}

const INITIAL_HISTORY_AVAILABILITY: HistoryAvailability = {
  canUndo: false,
  canRedo: false,
}

function areHistoryAvailabilityEqual(
  left: HistoryAvailability,
  right: HistoryAvailability,
) {
  return left.canUndo === right.canUndo && left.canRedo === right.canRedo
}

function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function getInitialSceneState() {
  return {
    history: createHistoryState<FurnitureItem[]>([]),
    instanceIdCounter: 0,
    selectedId: null,
    previewedIdRaw: null,
    historyAvailability: INITIAL_HISTORY_AVAILABILITY,
    isDragging: false,
    floorFinishId: '',
    wallFinishId: '',
    editorMessage: null,
  }
}

function getDerivedHistoryAvailability(
  history: HistoryState<unknown>,
  isDragging: boolean,
) {
  return {
    canUndo: !isDragging && canUndoHistory(history),
    canRedo: !isDragging && canRedoHistory(history),
  }
}

export const sceneStateStore = createStore<SceneStateStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialSceneState(),
    setHistory: (history) => {
      set((state) => {
        if (state.history === history) {
          return state
        }

        return {
          ...state,
          history,
          historyAvailability: getDerivedHistoryAvailability(
            history,
            state.isDragging,
          ),
        }
      })
    },
    updateHistory: (updater) => {
      set((state) => {
        const nextHistory = updater(state.history)

        if (nextHistory === state.history) {
          return state
        }

        return {
          ...state,
          history: nextHistory,
          historyAvailability: getDerivedHistoryAvailability(
            nextHistory,
            state.isDragging,
          ),
        }
      })
    },
    setInstanceIdCounter: (counter) => {
      set((state) => {
        if (state.instanceIdCounter === counter) {
          return state
        }

        return {
          ...state,
          instanceIdCounter: counter,
        }
      })
    },
    setSelectedId: (id) => {
      set((state) => {
        if (state.selectedId === id) {
          return state
        }

        return {
          ...state,
          selectedId: id,
          previewedIdRaw: null,
        }
      })
    },
    setPreviewedId: (id) => {
      set((state) => {
        if (state.previewedIdRaw === id) {
          return state
        }

        return {
          ...state,
          previewedIdRaw: id,
        }
      })
    },
    setDragging: (dragging) => {
      set((state) => {
        if (state.isDragging === dragging) {
          return state
        }

        return {
          ...state,
          isDragging: dragging,
          historyAvailability: getDerivedHistoryAvailability(
            state.history,
            dragging,
          ),
        }
      })
    },
    setFloorFinishId: (id) => {
      set((state) => {
        if (state.floorFinishId === id) {
          return state
        }

        return {
          ...state,
          floorFinishId: id,
        }
      })
    },
    setWallFinishId: (id) => {
      set((state) => {
        if (state.wallFinishId === id) {
          return state
        }

        return {
          ...state,
          wallFinishId: id,
        }
      })
    },
    setEditorMessage: (message) => {
      set((state) => {
        if (state.editorMessage === message) {
          return state
        }

        return {
          ...state,
          editorMessage: message,
        }
      })
    },
    clearEditorMessage: () => {
      get().setEditorMessage(null)
    },
    resetSceneState: () => {
      set((state) => ({
        ...state,
        ...getInitialSceneState(),
      }))
    },
  })),
)

sceneStateStore.subscribe(
  (state) => state.history.present,
  (items) => {
    const previewedId = sceneStateStore.getState().previewedIdRaw

    if (
      previewedId !== null &&
      !items.some((item) => item.id === previewedId)
    ) {
      sceneStateStore.getState().setPreviewedId(null)
    }
  },
)

export function useSceneStateStore<T>(
  selector: (state: SceneStateStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(sceneStateStore, selector, equalityFn)
}

export const sceneStateActions = {
  setHistory: (history: HistoryState<FurnitureItem[]>) => {
    sceneStateStore.getState().setHistory(history)
  },
  updateHistory: (
    updater: (
      history: HistoryState<FurnitureItem[]>,
    ) => HistoryState<FurnitureItem[]>,
  ) => {
    sceneStateStore.getState().updateHistory(updater)
  },
  setInstanceIdCounter: (counter: number) => {
    sceneStateStore.getState().setInstanceIdCounter(counter)
  },
  setSelectedId: (id: string | null) => {
    sceneStateStore.getState().setSelectedId(id)
  },
  setPreviewedId: (id: string | null) => {
    sceneStateStore.getState().setPreviewedId(id)
  },
  setDragging: (dragging: boolean) => {
    sceneStateStore.getState().setDragging(dragging)
  },
  setFloorFinishId: (id: string) => {
    sceneStateStore.getState().setFloorFinishId(id)
  },
  setWallFinishId: (id: string) => {
    sceneStateStore.getState().setWallFinishId(id)
  },
  setEditorMessage: (message: string | null) => {
    sceneStateStore.getState().setEditorMessage(message)
  },
  clearEditorMessage: () => {
    sceneStateStore.getState().clearEditorMessage()
  },
  resetSceneState: () => {
    sceneStateStore.getState().resetSceneState()
  },
}

export function resetSceneStateStore() {
  sceneStateActions.resetSceneState()
}

export const useItems = () =>
  useSceneStateStore((state) => state.history.present)
export const useSelectedId = () =>
  useSceneStateStore((state) => state.selectedId)
export const useHasSelection = () =>
  useSceneStateStore((state) => state.selectedId !== null)
export const useHistoryAvailability = () =>
  useSceneStateStore(
    (state) => state.historyAvailability,
    areHistoryAvailabilityEqual,
  )
export const useEditorMessage = () =>
  useSceneStateStore((state) => state.editorMessage)
export const useIsDragging = () =>
  useSceneStateStore((state) => state.isDragging)
export const useFloorFinishId = () =>
  useSceneStateStore((state) => state.floorFinishId)
export const useWallFinishId = () =>
  useSceneStateStore((state) => state.wallFinishId)
export const useItemIds = () =>
  useSceneStateStore(
    (state) => state.history.present.map((item) => item.id),
    areStringArraysEqual,
  )
export const useSelectedFurniture = () =>
  useSceneStateStore(selectSelectedFurniture)

export function selectSelectedFurniture(
  state: Pick<SceneStateStoreState, 'selectedId' | 'history'>,
): FurnitureItem | null {
  if (state.selectedId === null) {
    return null
  }

  return (
    state.history.present.find((item) => item.id === state.selectedId) ?? null
  )
}

export function usePreviewedId(options: {
  isBlockingOverlayOpen: boolean
  editorInteractionsEnabled: boolean
}) {
  return useSceneStateStore((state) => {
    const candidateId = state.previewedIdRaw

    if (candidateId === null) {
      return null
    }

    if (
      state.isDragging ||
      options.isBlockingOverlayOpen ||
      !options.editorInteractionsEnabled
    ) {
      return null
    }

    return state.history.present.some((item) => item.id === candidateId)
      ? candidateId
      : null
  })
}
