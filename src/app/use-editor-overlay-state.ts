import { useCallback, useState } from 'react'
import type { HistoryAvailability } from './components/history/history.types'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { FurnitureOutlinerItem } from './components/selection/furniture-outliner'

interface EditorOverlayState {
  catalogIdToAdd: string
  clearEditorMessage: () => void
  editorMessage: string | null
  handleHistoryChange: (availability: HistoryAvailability) => void
  handleSelectionChange: (item: FurnitureItem | null) => void
  handleSceneItemsChange: (items: FurnitureItem[]) => void
  historyAvailability: HistoryAvailability
  outlinerItems: FurnitureOutlinerItem[]
  resetOverlayState: () => void
  selectedFurniture: FurnitureItem | null
  setCatalogIdToAdd: (catalogId: string) => void
  setEditorMessage: (message: string | null) => void
}

const INITIAL_HISTORY_AVAILABILITY: HistoryAvailability = {
  canUndo: false,
  canRedo: false,
}

export function useEditorOverlayState(): EditorOverlayState {
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [sceneItems, setSceneItems] = useState<FurnitureItem[]>([])
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

  const handleSceneItemsChange = useCallback((items: FurnitureItem[]) => {
    setSceneItems(items)
  }, [])

  const handleHistoryChange = useCallback(
    (availability: HistoryAvailability) => {
      setHistoryAvailability(availability)
    },
    [],
  )

  const resetOverlayState = useCallback(() => {
    setSelectedFurniture(null)
    setSceneItems([])
    setEditorMessage(null)
    setHistoryAvailability(INITIAL_HISTORY_AVAILABILITY)
  }, [])

  const updateEditorMessage = useCallback((message: string | null) => {
    setEditorMessage(message)
  }, [])

  const clearEditorMessage = useCallback(() => {
    setEditorMessage(null)
  }, [])

  const outlinerItems = sceneItems.map((item) => ({
    id: item.id,
    label: item.name,
    selected: item.id === selectedFurniture?.id,
  }))

  return {
    catalogIdToAdd,
    clearEditorMessage,
    editorMessage,
    handleHistoryChange,
    handleSelectionChange,
    handleSceneItemsChange,
    historyAvailability,
    outlinerItems,
    resetOverlayState,
    selectedFurniture,
    setCatalogIdToAdd,
    setEditorMessage: updateEditorMessage,
  }
}
