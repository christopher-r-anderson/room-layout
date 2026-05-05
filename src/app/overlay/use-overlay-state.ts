import { useCallback, useState } from 'react'
import type { HistoryAvailability } from '../history/history.types'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel } from '@/scene/scene.types'

interface OverlayState {
  catalogIdToAdd: string
  clearEditorMessage: () => void
  editorMessage: string | null
  handleHistoryChange: (availability: HistoryAvailability) => void
  handleSceneReadModelChange: (readModel: SceneReadModel) => void
  historyAvailability: HistoryAvailability
  resetOverlayState: () => void
  sceneReadModel: SceneReadModel
  selectedFurniture: FurnitureItem | null
  setCatalogIdToAdd: (catalogId: string) => void
  setEditorMessage: (message: string | null) => void
}

const INITIAL_HISTORY_AVAILABILITY: HistoryAvailability = {
  canUndo: false,
  canRedo: false,
}

const INITIAL_SCENE_READ_MODEL: SceneReadModel = {
  selectedId: null,
  items: [],
}

export function useOverlayState(): OverlayState {
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [sceneReadModel, setSceneReadModel] = useState<SceneReadModel>(
    INITIAL_SCENE_READ_MODEL,
  )
  const [catalogIdToAdd, setCatalogIdToAdd] = useState(
    FURNITURE_CATALOG[0]?.id ?? '',
  )
  const [editorMessage, setEditorMessage] = useState<string | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState(
    INITIAL_HISTORY_AVAILABILITY,
  )

  const handleHistoryChange = useCallback(
    (availability: HistoryAvailability) => {
      setHistoryAvailability(availability)
    },
    [],
  )

  const handleSceneReadModelChange = useCallback(
    (readModel: SceneReadModel) => {
      setSceneReadModel(readModel)

      const nextSelectedFurniture = readModel.selectedId
        ? (readModel.items.find((item) => item.id === readModel.selectedId) ??
          null)
        : null

      setSelectedFurniture(nextSelectedFurniture)
    },
    [],
  )

  const resetOverlayState = useCallback(() => {
    setSelectedFurniture(null)
    setSceneReadModel(INITIAL_SCENE_READ_MODEL)
    setEditorMessage(null)
    setHistoryAvailability(INITIAL_HISTORY_AVAILABILITY)
  }, [])

  const updateEditorMessage = useCallback((message: string | null) => {
    setEditorMessage(message)
  }, [])

  const clearEditorMessage = useCallback(() => {
    setEditorMessage(null)
  }, [])

  return {
    catalogIdToAdd,
    clearEditorMessage,
    editorMessage,
    handleHistoryChange,
    handleSceneReadModelChange,
    historyAvailability,
    resetOverlayState,
    sceneReadModel,
    selectedFurniture,
    setCatalogIdToAdd,
    setEditorMessage: updateEditorMessage,
  }
}
