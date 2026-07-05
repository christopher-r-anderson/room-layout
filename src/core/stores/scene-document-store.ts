import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type { HistoryAvailability } from '../types/history.types'
import type { FurnitureItem } from '@/domain/furniture'
import type { EqualityChecker } from '../types/store.types'

interface SceneDocumentStoreState {
  history: HistoryState<FurnitureItem[]>
  instanceIdCounter: number
  selectedId: string | null
  previewedIdRaw: string | null
  historyAvailability: HistoryAvailability
  isDragging: boolean
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
  floorFinishLoading: boolean
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
  setLightingMoodId: (id: string) => void
  setFloorFinishLoading: (loading: boolean) => void
  resetSceneDocument: () => void
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

function getInitialSceneDocument() {
  return {
    history: createHistoryState<FurnitureItem[]>([]),
    instanceIdCounter: 0,
    selectedId: null,
    previewedIdRaw: null,
    historyAvailability: INITIAL_HISTORY_AVAILABILITY,
    isDragging: false,
    floorFinishId: '',
    wallFinishId: '',
    lightingMoodId: '',
    floorFinishLoading: false,
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

export const sceneDocumentStore = createStore<SceneDocumentStoreState>()(
  subscribeWithSelector((set) => ({
    ...getInitialSceneDocument(),
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
    setLightingMoodId: (id) => {
      set((state) => {
        if (state.lightingMoodId === id) {
          return state
        }

        return {
          ...state,
          lightingMoodId: id,
        }
      })
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
    resetSceneDocument: () => {
      set((state) => ({
        ...state,
        ...getInitialSceneDocument(),
      }))
    },
  })),
)

sceneDocumentStore.subscribe(
  (state) => state.history.present,
  (items) => {
    const previewedId = sceneDocumentStore.getState().previewedIdRaw

    if (
      previewedId !== null &&
      !items.some((item) => item.id === previewedId)
    ) {
      sceneDocumentStore.getState().setPreviewedId(null)
    }
  },
)

export function useSceneDocumentStore<T>(
  selector: (state: SceneDocumentStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(sceneDocumentStore, selector, equalityFn)
}

export const sceneDocumentActions = {
  setHistory: (history: HistoryState<FurnitureItem[]>) => {
    sceneDocumentStore.getState().setHistory(history)
  },
  updateHistory: (
    updater: (
      history: HistoryState<FurnitureItem[]>,
    ) => HistoryState<FurnitureItem[]>,
  ) => {
    sceneDocumentStore.getState().updateHistory(updater)
  },
  setInstanceIdCounter: (counter: number) => {
    sceneDocumentStore.getState().setInstanceIdCounter(counter)
  },
  setSelectedId: (id: string | null) => {
    sceneDocumentStore.getState().setSelectedId(id)
  },
  setPreviewedId: (id: string | null) => {
    sceneDocumentStore.getState().setPreviewedId(id)
  },
  setDragging: (dragging: boolean) => {
    sceneDocumentStore.getState().setDragging(dragging)
  },
  setFloorFinishId: (id: string) => {
    sceneDocumentStore.getState().setFloorFinishId(id)
  },
  setWallFinishId: (id: string) => {
    sceneDocumentStore.getState().setWallFinishId(id)
  },
  setLightingMoodId: (id: string) => {
    sceneDocumentStore.getState().setLightingMoodId(id)
  },
  setFloorFinishLoading: (loading: boolean) => {
    sceneDocumentStore.getState().setFloorFinishLoading(loading)
  },
  resetSceneDocument: () => {
    sceneDocumentStore.getState().resetSceneDocument()
  },
}

export function resetSceneDocumentStore() {
  sceneDocumentActions.resetSceneDocument()
}

export const useItems = () =>
  useSceneDocumentStore((state) => state.history.present)
export const useSelectedId = () =>
  useSceneDocumentStore((state) => state.selectedId)
export const useHasSelection = () =>
  useSceneDocumentStore((state) => state.selectedId !== null)
export const useHistoryAvailability = () =>
  useSceneDocumentStore(
    (state) => state.historyAvailability,
    areHistoryAvailabilityEqual,
  )
export const useFloorFinishId = () =>
  useSceneDocumentStore((state) => state.floorFinishId)
export const useWallFinishId = () =>
  useSceneDocumentStore((state) => state.wallFinishId)
export const useLightingMoodId = () =>
  useSceneDocumentStore((state) => state.lightingMoodId)
export const useFloorFinishLoading = () =>
  useSceneDocumentStore((state) => state.floorFinishLoading)
export const useItemIds = () =>
  useSceneDocumentStore(
    (state) => state.history.present.map((item) => item.id),
    areStringArraysEqual,
  )
// Distinct collection sourcePaths referenced by the current items. Value-equal
// results keep their identity, so consumers (the collection loader chain) do not
// recompute on unrelated item changes such as moves.
export const useItemSourcePaths = () =>
  useSceneDocumentStore(
    (state) => [
      ...new Set(state.history.present.map((item) => item.sourcePath)),
    ],
    areStringArraysEqual,
  )
export const useSelectedFurniture = () =>
  useSceneDocumentStore(selectSelectedFurniture)

export function selectSelectedFurniture(
  state: Pick<SceneDocumentStoreState, 'selectedId' | 'history'>,
): FurnitureItem | null {
  if (state.selectedId === null) {
    return null
  }

  return (
    state.history.present.find((item) => item.id === state.selectedId) ?? null
  )
}
