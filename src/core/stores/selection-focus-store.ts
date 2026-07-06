import { create } from 'zustand'
import type { InteractionSource } from '../types/interaction.types'
import type { OutlinerFocusRequest } from '../types/outliner.types'

// View-side routing that reacts to selection: how the selection was made
// (`selectedSource`, read to decide where focus lands after a delete) and where
// focus should be sent (outliner / room-view focus requests). The selection
// pointer itself lives in scene-document-store; this store is the presentation
// overlay reconciled on top of it.
interface SelectionFocusStoreState {
  selectedSource: InteractionSource
  outlinerFocusRequest: OutlinerFocusRequest | null
  roomViewFocusRequest: number | null
}

export const useSelectionFocusStore = create<SelectionFocusStoreState>()(
  () => ({
    selectedSource: null,
    outlinerFocusRequest: null,
    roomViewFocusRequest: null,
  }),
)

export const selectionFocusActions = {
  setSelectedSource: (source: InteractionSource) => {
    useSelectionFocusStore.setState({ selectedSource: source })
  },
  requestOutlinerFocus: (request: OutlinerFocusRequest) => {
    useSelectionFocusStore.setState({ outlinerFocusRequest: request })
  },
  clearOutlinerFocusRequest: () => {
    useSelectionFocusStore.setState({ outlinerFocusRequest: null })
  },
  requestRoomViewFocus: () => {
    useSelectionFocusStore.setState({ roomViewFocusRequest: Date.now() })
  },
  clearRoomViewFocusRequest: () => {
    useSelectionFocusStore.setState({ roomViewFocusRequest: null })
  },
  reset: () => {
    useSelectionFocusStore.setState(
      useSelectionFocusStore.getInitialState(),
      true,
    )
  },
}

export function resetSelectionFocusStore() {
  selectionFocusActions.reset()
}

export const useOutlinerFocusRequest = () =>
  useSelectionFocusStore((state) => state.outlinerFocusRequest)
export const useRoomViewFocusRequest = () =>
  useSelectionFocusStore((state) => state.roomViewFocusRequest)
