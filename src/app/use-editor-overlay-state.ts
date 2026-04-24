import { useCallback, useState, type RefObject } from 'react'
import type { HistoryAvailability } from './components/history/history.types'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneRef } from '@/scene/scene.types'

interface UseEditorOverlayStateOptions {
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
  sceneRef: RefObject<SceneRef | null>
}

interface EditorOverlayState {
  addFurniture: () => boolean
  catalogIdToAdd: string
  clearEditorMessage: () => void
  confirmDeleteSelection: () => void
  editorMessage: string | null
  handleHistoryChange: (availability: HistoryAvailability) => void
  handleSelectionChange: (item: FurnitureItem | null) => void
  historyAvailability: HistoryAvailability
  redo: () => void
  resetEditorShellState: () => void
  rotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem | null
  setCatalogIdToAdd: (catalogId: string) => void
  undo: () => void
}

const INITIAL_HISTORY_AVAILABILITY: HistoryAvailability = {
  canUndo: false,
  canRedo: false,
}

export function useEditorOverlayState({
  editorInteractionsEnabled,
  rotationStepRadians,
  sceneRef,
}: UseEditorOverlayStateOptions): EditorOverlayState {
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [catalogIdToAdd, setCatalogIdToAdd] = useState(
    FURNITURE_CATALOG[0]?.id ?? '',
  )
  const [editorMessage, setEditorMessage] = useState<string | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState(
    INITIAL_HISTORY_AVAILABILITY,
  )

  const handleSelectionChange = useCallback((item: FurnitureItem | null) => {
    setSelectedFurniture(item)
  }, [])

  const handleHistoryChange = useCallback(
    (availability: HistoryAvailability) => {
      setHistoryAvailability(availability)
    },
    [],
  )

  const resetEditorShellState = useCallback(() => {
    sceneRef.current = null
    setSelectedFurniture(null)
    setEditorMessage(null)
    setHistoryAvailability(INITIAL_HISTORY_AVAILABILITY)
  }, [sceneRef])

  const clearEditorMessage = useCallback(() => {
    setEditorMessage(null)
  }, [])

  const rotateSelection = useCallback(
    (direction: -1 | 1) => {
      if (!editorInteractionsEnabled) {
        return
      }

      sceneRef.current?.rotateSelection(direction * rotationStepRadians)
    },
    [editorInteractionsEnabled, rotationStepRadians, sceneRef],
  )

  const undo = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.undo()
  }, [editorInteractionsEnabled, sceneRef])

  const redo = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.redo()
  }, [editorInteractionsEnabled, sceneRef])

  const addFurniture = useCallback(() => {
    if (!editorInteractionsEnabled || !catalogIdToAdd) {
      return false
    }

    const result = sceneRef.current?.addFurniture(catalogIdToAdd)

    if (!result) {
      return false
    }

    if (!result.ok) {
      setEditorMessage(
        result.reason === 'no-space'
          ? 'No safe placement slot is available for that furniture item.'
          : 'The selected furniture entry is no longer available.',
      )
      return false
    }

    setEditorMessage(null)
    return true
  }, [catalogIdToAdd, editorInteractionsEnabled, sceneRef])

  const confirmDeleteSelection = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    const deleted = sceneRef.current?.deleteSelection() ?? false

    if (!deleted) {
      setEditorMessage('No selected furniture item was available to delete.')
      return
    }

    setEditorMessage(null)
  }, [editorInteractionsEnabled, sceneRef])

  return {
    addFurniture,
    catalogIdToAdd,
    clearEditorMessage,
    confirmDeleteSelection,
    editorMessage,
    handleHistoryChange,
    handleSelectionChange,
    historyAvailability,
    redo,
    resetEditorShellState,
    rotateSelection,
    selectedFurniture,
    setCatalogIdToAdd,
    undo,
  }
}
