import { useCallback, useState } from 'react'
import type { HistoryAvailability } from '../history/history.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel } from '@/scene/scene.types'
import type { InteractionSource } from '../scene-interaction.types'

interface OverlayState {
  catalogIdToAdd: string
  clearEditorMessage: () => void
  clearSelectedSource: () => void
  editorMessage: string | null
  handleHistoryChange: (availability: HistoryAvailability) => void
  handleSceneReadModelChange: (readModel: SceneReadModel) => void
  historyAvailability: HistoryAvailability
  initializeCatalogSelection: (catalog: FurnitureCatalogEntry[]) => void
  resetOverlayState: () => void
  sceneReadModel: SceneReadModel
  selectedFurniture: FurnitureItem | null
  selectedSource: InteractionSource
  setCatalogIdToAdd: (catalogId: string) => void
  setEditorMessage: (message: string | null) => void
  setSelectedSource: (source: InteractionSource) => void
}

const INITIAL_HISTORY_AVAILABILITY: HistoryAvailability = {
  canUndo: false,
  canRedo: false,
}

const INITIAL_SCENE_READ_MODEL: SceneReadModel = {
  selectedId: null,
  items: [],
}

function areHistoryAvailabilityEqual(
  left: HistoryAvailability,
  right: HistoryAvailability,
) {
  return left.canUndo === right.canUndo && left.canRedo === right.canRedo
}

function areSceneReadModelsEqual(left: SceneReadModel, right: SceneReadModel) {
  return left.selectedId === right.selectedId && left.items === right.items
}

export function useOverlayState(): OverlayState {
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [sceneReadModel, setSceneReadModel] = useState<SceneReadModel>(
    INITIAL_SCENE_READ_MODEL,
  )
  const [catalogIdToAdd, setCatalogIdToAdd] = useState('')
  const [editorMessage, setEditorMessage] = useState<string | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState(
    INITIAL_HISTORY_AVAILABILITY,
  )
  const [selectedSource, setSelectedSource] = useState<InteractionSource>(null)

  const handleHistoryChange = useCallback(
    (availability: HistoryAvailability) => {
      setHistoryAvailability((currentAvailability) =>
        areHistoryAvailabilityEqual(currentAvailability, availability)
          ? currentAvailability
          : availability,
      )
    },
    [],
  )

  const handleSceneReadModelChange = useCallback(
    (readModel: SceneReadModel) => {
      setSceneReadModel((currentReadModel) =>
        areSceneReadModelsEqual(currentReadModel, readModel)
          ? currentReadModel
          : readModel,
      )

      const nextSelectedFurniture = readModel.selectedId
        ? (readModel.items.find((item) => item.id === readModel.selectedId) ??
          null)
        : null

      setSelectedFurniture((currentSelectedFurniture) =>
        currentSelectedFurniture === nextSelectedFurniture
          ? currentSelectedFurniture
          : nextSelectedFurniture,
      )

      if (readModel.selectedId === null) {
        setSelectedSource(null)
      }
    },
    [],
  )

  const resetOverlayState = useCallback(() => {
    setSelectedFurniture(null)
    setSceneReadModel(INITIAL_SCENE_READ_MODEL)
    setEditorMessage(null)
    setHistoryAvailability(INITIAL_HISTORY_AVAILABILITY)
    setSelectedSource(null)
  }, [])

  const initializeCatalogSelection = useCallback(
    (catalog: FurnitureCatalogEntry[]) => {
      setCatalogIdToAdd((prevId) => {
        // If already initialized, preserve the current selection if it exists in
        // the new catalog, otherwise fall back to the first entry
        if (prevId) {
          const exists = catalog.some((entry) => entry.id === prevId)
          return exists ? prevId : (catalog[0]?.id ?? '')
        }
        // Only initialize if empty
        return catalog[0]?.id ?? ''
      })
    },
    [],
  )

  const updateEditorMessage = useCallback((message: string | null) => {
    setEditorMessage(message)
  }, [])

  const clearEditorMessage = useCallback(() => {
    setEditorMessage(null)
  }, [])

  const clearSelectedSource = useCallback(() => {
    setSelectedSource(null)
  }, [])

  return {
    catalogIdToAdd,
    clearEditorMessage,
    clearSelectedSource,
    editorMessage,
    handleHistoryChange,
    handleSceneReadModelChange,
    historyAvailability,
    initializeCatalogSelection,
    resetOverlayState,
    sceneReadModel,
    selectedFurniture,
    selectedSource,
    setCatalogIdToAdd,
    setEditorMessage: updateEditorMessage,
    setSelectedSource,
  }
}
