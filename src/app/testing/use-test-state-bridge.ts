import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import {
  editorRuntimeStore,
  type RestoreOutcome,
} from '@/core/stores/editor-runtime-store'
import { sceneStateStore } from '@/core/stores/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import {
  type PerfCounterSnapshot,
  perfCounters,
} from '@/shared/debug/perf-counters'

interface BrowserSceneState {
  assetsReady: boolean
  assetError: boolean
  cameraPosition: [number, number, number]
  floorFinishId: string
  wallFinishId: string
  selectedId: string | null
  previewedId: string | null
  selectedName: string | null
  itemCount: number
  items: {
    id: string
    catalogId: string
    name: string
    position: [number, number, number]
    rotationY: number
    pointerTarget: {
      x: number
      y: number
    } | null
  }[]
  restoreOutcome: RestoreOutcome | null
  restoreAttemptCount: number
}

declare global {
  interface Window {
    __ROOM_LAYOUT_TEST__?: {
      getState: () => BrowserSceneState
      setOverlaysHidden: (hidden: boolean) => void
      getPerfCounters: () => PerfCounterSnapshot
      resetPerfCounters: () => void
    }
  }
}

interface UseTestStateBridgeOptions {
  activeFloorFinishId: string
  activeWallFinishId: string
  previewedIdRef: RefObject<string | null>
  setTestOverlaysHidden: Dispatch<SetStateAction<boolean>>
}

export function useTestStateBridge({
  activeFloorFinishId,
  activeWallFinishId,
  previewedIdRef,
  setTestOverlaysHidden,
}: UseTestStateBridgeOptions) {
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    window.__ROOM_LAYOUT_TEST__ = {
      getState: () => {
        const storeState = sceneStateStore.getState()
        const snapshotItems = sceneCommands.getSnapshot()?.items ?? []
        const pointerTargetsById = new Map(
          snapshotItems.map((item) => [item.id, item.pointerTarget] as const),
        )
        const cameraPosition = sceneCommands.getCameraPosition()
        const selectedItem = storeState.selectedId
          ? (storeState.history.present.find(
              (item) => item.id === storeState.selectedId,
            ) ?? null)
          : null

        return {
          assetsReady: editorRuntimeStore.getState().startupPhase === 'ready',
          assetError: editorRuntimeStore.getState().assetError !== null,
          cameraPosition,
          floorFinishId: activeFloorFinishId,
          wallFinishId: activeWallFinishId,
          selectedId: storeState.selectedId,
          previewedId: previewedIdRef.current,
          selectedName: selectedItem?.name ?? null,
          itemCount: storeState.history.present.length,
          items: storeState.history.present.map((item) => ({
            id: item.id,
            catalogId: item.catalogId,
            name: item.name,
            position: item.position,
            rotationY: item.rotationY,
            pointerTarget: pointerTargetsById.get(item.id) ?? null,
          })),
          restoreOutcome: editorRuntimeStore.getState().restoreOutcome,
          restoreAttemptCount:
            editorRuntimeStore.getState().restoreAttemptCount,
        }
      },
      setOverlaysHidden: (hidden: boolean) => {
        setTestOverlaysHidden(hidden)
      },
      getPerfCounters: () => perfCounters.read(),
      resetPerfCounters: () => {
        perfCounters.reset()
      },
    }

    return () => {
      delete window.__ROOM_LAYOUT_TEST__
    }
  }, [
    activeFloorFinishId,
    activeWallFinishId,
    previewedIdRef,
    setTestOverlaysHidden,
  ])
}
