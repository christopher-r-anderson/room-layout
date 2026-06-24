import { useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  editorLifecycleStore,
  isEditorInteractive,
  type RestoreOutcome,
} from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentStore } from '@/core/stores/scene-document-store'
import { getPreviewedId } from '@/core/operations/previewed-id'
import { getActiveFinishIds } from '@/core/operations/active-finish-ids'
import { sceneCommands } from '@/scene/scene-commands'
import {
  type PerfCounterSnapshot,
  perfCounters,
} from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'

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
  setTestOverlaysHidden: Dispatch<SetStateAction<boolean>>
}

export function useTestStateBridge({
  setTestOverlaysHidden,
}: UseTestStateBridgeOptions) {
  useEffect(() => {
    if (!import.meta.env.DEV && !IS_E2E_BUILD) {
      return
    }

    window.__ROOM_LAYOUT_TEST__ = {
      getState: () => {
        const storeState = sceneDocumentStore.getState()
        const snapshotItems = sceneCommands.getSnapshot()?.items ?? []
        const pointerTargetsById = new Map(
          snapshotItems.map((item) => [item.id, item.pointerTarget] as const),
        )
        const cameraPosition = sceneCommands.getCameraPosition()
        const { activeFloorFinishId, activeWallFinishId } = getActiveFinishIds()
        const selectedItem = storeState.selectedId
          ? (storeState.history.present.find(
              (item) => item.id === storeState.selectedId,
            ) ?? null)
          : null

        return {
          assetsReady: isEditorInteractive(),
          assetError: editorLifecycleStore.getState().assetError !== null,
          cameraPosition,
          floorFinishId: activeFloorFinishId,
          wallFinishId: activeWallFinishId,
          selectedId: storeState.selectedId,
          previewedId: getPreviewedId(),
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
          restoreOutcome: editorLifecycleStore.getState().restoreOutcome,
          restoreAttemptCount:
            editorLifecycleStore.getState().restoreAttemptCount,
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
  }, [setTestOverlaysHidden])
}
