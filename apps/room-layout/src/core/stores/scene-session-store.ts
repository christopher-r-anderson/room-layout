import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// The scene session: transient editor state scoped to the current sitting -
// never serialized, never part of the undo timeline. Holds the raw hover
// preview pointer (gated for reads by usePreviewedId), the live drag flag
// (written synchronously with the gesture), and the floor-finish loading
// indicator.
interface SceneSessionStoreState {
  previewedIdRaw: string | null
  isDragging: boolean
  floorFinishLoading: boolean
}

export const useSceneSessionStore = create<SceneSessionStoreState>()(
  subscribeWithSelector(
    (): SceneSessionStoreState => ({
      previewedIdRaw: null,
      isDragging: false,
      floorFinishLoading: false,
    }),
  ),
)

export const sceneSessionActions = {
  setPreviewedId: (id: string | null) => {
    useSceneSessionStore.setState((state) =>
      state.previewedIdRaw === id ? state : { previewedIdRaw: id },
    )
  },
  setDragging: (dragging: boolean) => {
    useSceneSessionStore.setState((state) =>
      state.isDragging === dragging ? state : { isDragging: dragging },
    )
  },
  setFloorFinishLoading: (loading: boolean) => {
    useSceneSessionStore.setState((state) =>
      state.floorFinishLoading === loading
        ? state
        : { floorFinishLoading: loading },
    )
  },
  reset: () => {
    useSceneSessionStore.setState(useSceneSessionStore.getInitialState(), true)
  },
}

export function resetSceneSessionStore() {
  sceneSessionActions.reset()
}

export const useIsDragging = () =>
  useSceneSessionStore((state) => state.isDragging)
export const useFloorFinishLoading = () =>
  useSceneSessionStore((state) => state.floorFinishLoading)
