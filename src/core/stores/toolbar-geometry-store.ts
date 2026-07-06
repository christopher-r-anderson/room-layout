import { create } from 'zustand'
import type { ScreenPoint, SelectedToolbarGeometry } from '@/scene/scene.types'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'

// The selected item's toolbar geometry: the scene projects the selected item's
// bounds to screen points each frame and writes them here; the placement hook
// reads them to position the floating toolbar. This is a one-writer (scene raf
// loop) / one-reader (placement) data pipe, kept apart from selection focus
// routing because the two share nothing but the word "selection".
interface ToolbarGeometryStoreState {
  toolbarGeometry: SelectedToolbarGeometry
}

const INITIAL_SELECTED_TOOLBAR_GEOMETRY: SelectedToolbarGeometry = {
  kind: 'unavailable',
  selectedId: null,
  reason: 'no-selection',
}

function areScreenPointsEqual(left: ScreenPoint, right: ScreenPoint) {
  return left.x === right.x && left.y === right.y
}

function areSelectedToolbarGeometriesEqual(
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

// Module-private: the scene writes through toolbarGeometryActions (the one
// writer) and the placement hook reads through useToolbarGeometry.
const useToolbarGeometryStore = create<ToolbarGeometryStoreState>()(() => ({
  toolbarGeometry: INITIAL_SELECTED_TOOLBAR_GEOMETRY,
}))

export const toolbarGeometryActions = {
  setToolbarGeometry: (geometry: SelectedToolbarGeometry) => {
    useToolbarGeometryStore.setState((state) => {
      if (areSelectedToolbarGeometriesEqual(state.toolbarGeometry, geometry)) {
        if (import.meta.env.DEV || IS_E2E_BUILD) {
          perfCounters.incrToolbarSinkNoOp()
        }
        return state
      }

      if (import.meta.env.DEV || IS_E2E_BUILD) {
        perfCounters.incrToolbarSinkWrite()
      }

      return { toolbarGeometry: geometry }
    })
  },
  reset: () => {
    useToolbarGeometryStore.setState(
      useToolbarGeometryStore.getInitialState(),
      true,
    )
  },
}

export function resetToolbarGeometryStore() {
  toolbarGeometryActions.reset()
}

export const toolbarGeometryStoreForTests = {
  getState: () => useToolbarGeometryStore.getState(),
  getInitialState: () => useToolbarGeometryStore.getInitialState(),
  subscribe: (listener: () => void) =>
    useToolbarGeometryStore.subscribe(listener),
}

export const useToolbarGeometry = () =>
  useToolbarGeometryStore((state) => state.toolbarGeometry)
