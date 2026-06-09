import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { InteractionSource } from './types/interaction.types'
import type { SceneOutlinerFocusRequest } from './types/scene-panel.types'
import type { ScreenPoint, SelectedToolbarGeometry } from '@/scene/scene.types'
import { perfCounters } from '@/lib/debug/perf-counters'
import type { EqualityChecker } from './store-types'

interface SelectionMetaStoreState {
  selectedSource: InteractionSource
  toolbarGeometry: SelectedToolbarGeometry
  outlinerFocusRequest: SceneOutlinerFocusRequest | null
  setSelectedSource: (source: InteractionSource) => void
  setToolbarGeometry: (geometry: SelectedToolbarGeometry) => void
  requestOutlinerFocus: (request: SceneOutlinerFocusRequest) => void
  clearOutlinerFocusRequest: () => void
  reset: () => void
}

export const INITIAL_SELECTED_TOOLBAR_GEOMETRY: SelectedToolbarGeometry = {
  kind: 'unavailable',
  selectedId: null,
  reason: 'no-selection',
}

function areScreenPointsEqual(left: ScreenPoint, right: ScreenPoint) {
  return left.x === right.x && left.y === right.y
}

export function areSelectedToolbarGeometriesEqual(
  currentGeometry: SelectedToolbarGeometry,
  nextGeometry: SelectedToolbarGeometry,
) {
  if (
    currentGeometry.kind === 'unavailable' &&
    nextGeometry.kind === 'unavailable'
  ) {
    return (
      currentGeometry.selectedId === nextGeometry.selectedId &&
      currentGeometry.reason === nextGeometry.reason
    )
  }

  if (
    currentGeometry.kind !== 'available' ||
    nextGeometry.kind !== 'available'
  ) {
    return false
  }

  return (
    currentGeometry.selectedId === nextGeometry.selectedId &&
    currentGeometry.source === nextGeometry.source &&
    currentGeometry.sourceNodeName === nextGeometry.sourceNodeName &&
    currentGeometry.canvasSize.width === nextGeometry.canvasSize.width &&
    currentGeometry.canvasSize.height === nextGeometry.canvasSize.height &&
    currentGeometry.sourcePointCount === nextGeometry.sourcePointCount &&
    currentGeometry.projectedPointCount === nextGeometry.projectedPointCount &&
    currentGeometry.points.length === nextGeometry.points.length &&
    currentGeometry.points.every((point, index) =>
      areScreenPointsEqual(point, nextGeometry.points[index]),
    )
  )
}

function getInitialSelectionMetaState() {
  return {
    selectedSource: null,
    toolbarGeometry: INITIAL_SELECTED_TOOLBAR_GEOMETRY,
    outlinerFocusRequest: null,
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
    setToolbarGeometry: (geometry) => {
      set((state) => {
        if (
          areSelectedToolbarGeometriesEqual(state.toolbarGeometry, geometry)
        ) {
          if (import.meta.env.DEV) {
            perfCounters.incrToolbarSinkNoOp()
          }
          return state
        }

        if (import.meta.env.DEV) {
          perfCounters.incrToolbarSinkWrite()
        }

        return {
          ...state,
          toolbarGeometry: geometry,
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
    reset: () => {
      set(() => ({
        ...getInitialSelectionMetaState(),
        setSelectedSource: get().setSelectedSource,
        setToolbarGeometry: get().setToolbarGeometry,
        requestOutlinerFocus: get().requestOutlinerFocus,
        clearOutlinerFocusRequest: get().clearOutlinerFocusRequest,
        reset: get().reset,
      }))
    },
  })),
)

export function useSelectionMetaStore<T>(
  selector: (state: SelectionMetaStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(selectionMetaStore, selector, equalityFn)
}

export const selectionMetaActions = {
  setSelectedSource: (source: InteractionSource) => {
    selectionMetaStore.getState().setSelectedSource(source)
  },
  setToolbarGeometry: (geometry: SelectedToolbarGeometry) => {
    selectionMetaStore.getState().setToolbarGeometry(geometry)
  },
  requestOutlinerFocus: (request: SceneOutlinerFocusRequest) => {
    selectionMetaStore.getState().requestOutlinerFocus(request)
  },
  clearOutlinerFocusRequest: () => {
    selectionMetaStore.getState().clearOutlinerFocusRequest()
  },
  reset: () => {
    selectionMetaStore.getState().reset()
  },
}

export function resetSelectionMetaStore() {
  selectionMetaActions.reset()
}

export const useSelectedSource = () =>
  useSelectionMetaStore((state) => state.selectedSource)
export const useToolbarGeometry = () =>
  useSelectionMetaStore((state) => state.toolbarGeometry)
export const useOutlinerFocusRequest = () =>
  useSelectionMetaStore((state) => state.outlinerFocusRequest)
