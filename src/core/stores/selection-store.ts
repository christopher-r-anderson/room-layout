import { create } from 'zustand'

/** How a selection was made; the provenance behind `selectedSource`. */
export type InteractionSource =
  | 'canvas-keyboard'
  | 'canvas-pointer'
  | 'panel-keyboard'
  | 'panel-pointer'
  | 'toolbar'
  | null

export type PanelInteractionSource = 'panel-keyboard' | 'panel-pointer'

export interface OutlinerFocusRequest {
  token: number
  preferredIndex?: number
  targetSelectedId?: string | null
  focusContainer?: boolean
}

// The selection session: the selected item pointer, how it was selected
// (`selectedSource`, read to decide where focus lands after a delete), and the
// focus-intent tokens (outliner / room-view focus handoff). Session-scoped -
// never serialized, never part of the undo timeline (history mutations
// reconcile the pointer against the restored items instead).
interface SelectionStoreState {
  selectedId: string | null
  selectedSource: InteractionSource
  outlinerFocusRequest: OutlinerFocusRequest | null
  roomViewFocusRequest: number | null
}

export const useSelectionStore = create<SelectionStoreState>()(() => ({
  selectedId: null,
  selectedSource: null,
  outlinerFocusRequest: null,
  roomViewFocusRequest: null,
}))

export const selectionActions = {
  // The pointer and its provenance always travel together: a selection without
  // a source is a programmatic one (undo/redo, restore).
  setSelection: (id: string | null, source: InteractionSource) => {
    useSelectionStore.setState((state) => {
      const nextSource = id === null ? null : source
      return state.selectedId === id && state.selectedSource === nextSource
        ? state
        : { selectedId: id, selectedSource: nextSource }
    })
  },
  requestOutlinerFocus: (request: OutlinerFocusRequest) => {
    useSelectionStore.setState({ outlinerFocusRequest: request })
  },
  clearOutlinerFocusRequest: () => {
    useSelectionStore.setState((state) =>
      state.outlinerFocusRequest === null
        ? state
        : { outlinerFocusRequest: null },
    )
  },
  requestRoomViewFocus: () => {
    useSelectionStore.setState({ roomViewFocusRequest: Date.now() })
  },
  clearRoomViewFocusRequest: () => {
    useSelectionStore.setState((state) =>
      state.roomViewFocusRequest === null
        ? state
        : { roomViewFocusRequest: null },
    )
  },
  reset: () => {
    useSelectionStore.setState(useSelectionStore.getInitialState(), true)
  },
}

export function resetSelectionStore() {
  selectionActions.reset()
}

/** Non-reactive read of the selection provenance for use outside React. */
export function getSelectedSource() {
  return useSelectionStore.getState().selectedSource
}

export const useSelectedId = () =>
  useSelectionStore((state) => state.selectedId)
export const useHasSelection = () =>
  useSelectionStore((state) => state.selectedId !== null)
export const useOutlinerFocusRequest = () =>
  useSelectionStore((state) => state.outlinerFocusRequest)
export const useRoomViewFocusRequest = () =>
  useSelectionStore((state) => state.roomViewFocusRequest)
