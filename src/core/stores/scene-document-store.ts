import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  createHistoryState,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'

// The scene document: the persisted, undoable description of the room - the
// furniture history, the id counter behind stable instance ids, and the active
// finish/mood ids. Session state (preview, drag, transient loading) lives in
// scene-session-store.
interface SceneDocumentStoreState {
  history: HistoryState<FurnitureItem[]>
  instanceIdCounter: number
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
}

export const useSceneDocumentStore = create<SceneDocumentStoreState>()(
  subscribeWithSelector(
    (): SceneDocumentStoreState => ({
      history: createHistoryState<FurnitureItem[]>([]),
      instanceIdCounter: 0,
      floorFinishId: '',
      wallFinishId: '',
      lightingMoodId: '',
    }),
  ),
)

export const sceneDocumentActions = {
  setHistory: (history: HistoryState<FurnitureItem[]>) => {
    useSceneDocumentStore.setState((state) =>
      state.history === history ? state : { history },
    )
  },
  updateHistory: (
    updater: (
      history: HistoryState<FurnitureItem[]>,
    ) => HistoryState<FurnitureItem[]>,
  ) => {
    useSceneDocumentStore.setState((state) => {
      const nextHistory = updater(state.history)

      return nextHistory === state.history ? state : { history: nextHistory }
    })
  },
  setInstanceIdCounter: (counter: number) => {
    useSceneDocumentStore.setState((state) =>
      state.instanceIdCounter === counter
        ? state
        : { instanceIdCounter: counter },
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

/** Non-reactive peer of {@link useItems} for use outside React. */
export function getItems() {
  return useSceneDocumentStore.getState().history.present
}
export const useFloorFinishId = () =>
  useSceneDocumentStore((state) => state.floorFinishId)
export const useWallFinishId = () =>
  useSceneDocumentStore((state) => state.wallFinishId)
export const useLightingMoodId = () =>
  useSceneDocumentStore((state) => state.lightingMoodId)
