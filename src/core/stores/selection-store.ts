import { create } from 'zustand'

/** How a selection gesture was made; drives selection announcements. */
export type InteractionSource =
  | 'canvas-keyboard'
  | 'canvas-pointer'
  | 'panel-keyboard'
  | 'panel-pointer'
  | 'toolbar'
  | null

export type PanelInteractionSource = 'panel-keyboard' | 'panel-pointer'

// The selection session: the selected item pointer. Session-scoped - never
// serialized, never part of the undo timeline (history mutations reconcile the
// pointer against the restored items instead).
interface SelectionStoreState {
  selectedId: string | null
}

export const useSelectionStore = create<SelectionStoreState>()(() => ({
  selectedId: null,
}))

export const selectionActions = {
  setSelection: (id: string | null) => {
    useSelectionStore.setState((state) =>
      state.selectedId === id ? state : { selectedId: id },
    )
  },
  reset: () => {
    useSelectionStore.setState(useSelectionStore.getInitialState(), true)
  },
}

export function resetSelectionStore() {
  selectionActions.reset()
}

export const useSelectedId = () =>
  useSelectionStore((state) => state.selectedId)
export const useHasSelection = () =>
  useSelectionStore((state) => state.selectedId !== null)
