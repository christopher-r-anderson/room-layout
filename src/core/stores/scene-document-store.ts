import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type { HistoryAvailability } from '../types/history.types'
import type { FurnitureItem } from '@/domain/furniture'

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
}

const INITIAL_HISTORY_AVAILABILITY: HistoryAvailability = {
  canUndo: false,
  canRedo: false,
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

// A previewed item that leaves the item list (delete, undo of an add) must not
// keep a dangling preview pointer.
function reconcilePreviewedId(
  previewedId: string | null,
  items: FurnitureItem[],
): string | null {
  if (previewedId !== null && !items.some((item) => item.id === previewedId)) {
    return null
  }
  return previewedId
}

export const useSceneDocumentStore = create<SceneDocumentStoreState>()(
  subscribeWithSelector(
    (): SceneDocumentStoreState => ({
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
    }),
  ),
)

export const sceneDocumentActions = {
  setHistory: (history: HistoryState<FurnitureItem[]>) => {
    useSceneDocumentStore.setState((state) => {
      if (state.history === history) {
        return state
      }

      return {
        history,
        historyAvailability: getDerivedHistoryAvailability(
          history,
          state.isDragging,
        ),
        previewedIdRaw: reconcilePreviewedId(
          state.previewedIdRaw,
          history.present,
        ),
      }
    })
  },
  updateHistory: (
    updater: (
      history: HistoryState<FurnitureItem[]>,
    ) => HistoryState<FurnitureItem[]>,
  ) => {
    useSceneDocumentStore.setState((state) => {
      const nextHistory = updater(state.history)

      if (nextHistory === state.history) {
        return state
      }

      return {
        history: nextHistory,
        historyAvailability: getDerivedHistoryAvailability(
          nextHistory,
          state.isDragging,
        ),
        previewedIdRaw: reconcilePreviewedId(
          state.previewedIdRaw,
          nextHistory.present,
        ),
      }
    })
  },
  setInstanceIdCounter: (counter: number) => {
    useSceneDocumentStore.setState((state) =>
      state.instanceIdCounter === counter
        ? state
        : { instanceIdCounter: counter },
    )
  },
  setSelectedId: (id: string | null) => {
    useSceneDocumentStore.setState((state) =>
      state.selectedId === id
        ? state
        : { selectedId: id, previewedIdRaw: null },
    )
  },
  setPreviewedId: (id: string | null) => {
    useSceneDocumentStore.setState((state) =>
      state.previewedIdRaw === id ? state : { previewedIdRaw: id },
    )
  },
  setDragging: (dragging: boolean) => {
    useSceneDocumentStore.setState((state) =>
      state.isDragging === dragging
        ? state
        : {
            isDragging: dragging,
            historyAvailability: getDerivedHistoryAvailability(
              state.history,
              dragging,
            ),
          },
    )
  },
  setFloorFinishId: (id: string) => {
    useSceneDocumentStore.setState((state) =>
      state.floorFinishId === id ? state : { floorFinishId: id },
    )
  },
  setWallFinishId: (id: string) => {
    useSceneDocumentStore.setState((state) =>
      state.wallFinishId === id ? state : { wallFinishId: id },
    )
  },
  setLightingMoodId: (id: string) => {
    useSceneDocumentStore.setState((state) =>
      state.lightingMoodId === id ? state : { lightingMoodId: id },
    )
  },
  setFloorFinishLoading: (loading: boolean) => {
    useSceneDocumentStore.setState((state) =>
      state.floorFinishLoading === loading
        ? state
        : { floorFinishLoading: loading },
    )
  },
  reset: () => {
    useSceneDocumentStore.setState(
      useSceneDocumentStore.getInitialState(),
      true,
    )
  },
}

export function resetSceneDocumentStore() {
  sceneDocumentActions.reset()
}

export const useItems = () =>
  useSceneDocumentStore((state) => state.history.present)
export const useSelectedId = () =>
  useSceneDocumentStore((state) => state.selectedId)
export const useHasSelection = () =>
  useSceneDocumentStore((state) => state.selectedId !== null)
export const useHistoryAvailability = () =>
  useSceneDocumentStore(useShallow((state) => state.historyAvailability))
export const useFloorFinishId = () =>
  useSceneDocumentStore((state) => state.floorFinishId)
export const useWallFinishId = () =>
  useSceneDocumentStore((state) => state.wallFinishId)
export const useLightingMoodId = () =>
  useSceneDocumentStore((state) => state.lightingMoodId)
export const useFloorFinishLoading = () =>
  useSceneDocumentStore((state) => state.floorFinishLoading)
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
