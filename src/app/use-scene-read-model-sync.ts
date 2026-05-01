import { useCallback, useRef, useState, type RefObject } from 'react'
import type { SceneReadModel, SceneRef } from '@/scene/scene.types'
import type { SceneOutlinerFocusRequest } from './components/scene/scene-outliner'

interface UseSceneReadModelSyncOptions {
  sceneRef: RefObject<SceneRef | null>
  isModalOpen: boolean
  handleSceneReadModelChange: (readModel: SceneReadModel) => void
  announcePolite: (message: string) => void
}

interface SceneReadModelSync {
  syncSceneReadModel: (options?: {
    announceSelectionChange?: boolean
    requestOutlinerFocus?: boolean
  }) => SceneReadModel | null
  outlinerFocusRequest: SceneOutlinerFocusRequest | null
  handleOutlinerFocusHandled: () => void
  requestOutlinerFocusByIndex: (preferredIndex: number) => void
}

export function useSceneReadModelSync({
  sceneRef,
  isModalOpen,
  handleSceneReadModelChange,
  announcePolite,
}: UseSceneReadModelSyncOptions): SceneReadModelSync {
  const [outlinerFocusRequest, setOutlinerFocusRequest] =
    useState<SceneOutlinerFocusRequest | null>(null)
  const previousSelectedIdRef = useRef<string | null>(null)

  const syncSceneReadModel = useCallback(
    (options?: {
      announceSelectionChange?: boolean
      requestOutlinerFocus?: boolean
    }): SceneReadModel | null => {
      const nextReadModel = sceneRef.current?.getReadModel() ?? null

      if (!nextReadModel) {
        return null
      }

      const previousSelectedId = previousSelectedIdRef.current
      const selectionChanged = previousSelectedId !== nextReadModel.selectedId

      handleSceneReadModelChange(nextReadModel)

      if (selectionChanged && options?.announceSelectionChange !== false) {
        if (nextReadModel.selectedId) {
          const selectedItem = nextReadModel.items.find(
            (item) => item.id === nextReadModel.selectedId,
          )

          if (selectedItem) {
            announcePolite(`${selectedItem.name} selected.`)
          }
        } else if (previousSelectedId) {
          announcePolite('Selection cleared.')
        }
      }

      if (
        selectionChanged &&
        options?.requestOutlinerFocus !== false &&
        !isModalOpen &&
        outlinerFocusRequest === null
      ) {
        if (nextReadModel.selectedId) {
          setOutlinerFocusRequest({
            token: Date.now(),
            targetSelectedId: nextReadModel.selectedId,
          })
        } else if (previousSelectedId) {
          setOutlinerFocusRequest({
            token: Date.now(),
            focusContainer: true,
          })
        }
      }

      previousSelectedIdRef.current = nextReadModel.selectedId
      return nextReadModel
    },
    [
      announcePolite,
      handleSceneReadModelChange,
      isModalOpen,
      outlinerFocusRequest,
      sceneRef,
    ],
  )

  const handleOutlinerFocusHandled = useCallback(() => {
    setOutlinerFocusRequest(null)
  }, [])

  const requestOutlinerFocusByIndex = useCallback((preferredIndex: number) => {
    setOutlinerFocusRequest({
      token: Date.now(),
      preferredIndex,
    })
  }, [])

  return {
    syncSceneReadModel,
    outlinerFocusRequest,
    handleOutlinerFocusHandled,
    requestOutlinerFocusByIndex,
  }
}
