import { useCallback, useState, type RefObject } from 'react'
import type { HistoryAvailability } from './components/history/history.types'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneRef } from '@/scene/scene.types'

interface UseEditorOverlayStateOptions {
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
  sceneRef: RefObject<SceneRef | null>
  startupOverlayActive: boolean
}

interface EditorOverlayState {
  addFurniture: () => boolean
  catalogIdToAdd: string
  closeDeleteDialog: () => void
  closeOpenDialogs: () => void
  confirmDeleteSelection: () => void
  editorMessage: string | null
  getIsModalOpen: () => boolean
  handleHistoryChange: (availability: HistoryAvailability) => void
  handleSelectionChange: (item: FurnitureItem | null) => void
  isCatalogDrawerOpen: boolean
  historyAvailability: HistoryAvailability
  isDeleteDialogOpen: boolean
  isInfoDialogOpen: boolean
  openDeleteDialog: () => void
  pendingDeleteFurniture: FurnitureItem | null
  redo: () => void
  resetEditorShellState: () => void
  rotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem | null
  setCatalogDrawerOpen: (open: boolean) => void
  setInfoDialogOpen: (open: boolean) => void
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
  startupOverlayActive,
}: UseEditorOverlayStateOptions): EditorOverlayState {
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [catalogIdToAdd, setCatalogIdToAdd] = useState(
    FURNITURE_CATALOG[0]?.id ?? '',
  )
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)
  const [editorMessage, setEditorMessage] = useState<string | null>(null)
  const [isCatalogDrawerOpen, setIsCatalogDrawerOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
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
    setPendingDeleteFurniture(null)
    setEditorMessage(null)
    setIsCatalogDrawerOpen(false)
    setIsDeleteDialogOpen(false)
    setIsInfoDialogOpen(false)
    setHistoryAvailability(INITIAL_HISTORY_AVAILABILITY)
  }, [sceneRef])

  const closeOpenDialogs = useCallback(() => {
    setIsCatalogDrawerOpen(false)
    setIsDeleteDialogOpen(false)
    setIsInfoDialogOpen(false)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false)
    setPendingDeleteFurniture(null)
  }, [])

  const setCatalogDrawerOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsCatalogDrawerOpen(false)
        return
      }

      if (
        !editorInteractionsEnabled ||
        isDeleteDialogOpen ||
        isInfoDialogOpen
      ) {
        return
      }

      setEditorMessage(null)
      setIsCatalogDrawerOpen(true)
    },
    [editorInteractionsEnabled, isDeleteDialogOpen, isInfoDialogOpen],
  )

  const setInfoDialogOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsInfoDialogOpen(false)
        return
      }

      if (startupOverlayActive || isDeleteDialogOpen || isCatalogDrawerOpen) {
        return
      }

      setIsInfoDialogOpen(true)
    },
    [isCatalogDrawerOpen, isDeleteDialogOpen, startupOverlayActive],
  )

  const openDeleteDialog = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      !selectedFurniture ||
      isDeleteDialogOpen ||
      isCatalogDrawerOpen ||
      isInfoDialogOpen
    ) {
      return
    }

    setPendingDeleteFurniture(selectedFurniture)
    setEditorMessage(null)
    setIsDeleteDialogOpen(true)
  }, [
    editorInteractionsEnabled,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isInfoDialogOpen,
    selectedFurniture,
  ])

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

  const getIsModalOpen = useCallback(() => {
    return isCatalogDrawerOpen || isDeleteDialogOpen || isInfoDialogOpen
  }, [isCatalogDrawerOpen, isDeleteDialogOpen, isInfoDialogOpen])

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

    closeDeleteDialog()

    if (!deleted) {
      setEditorMessage('No selected furniture item was available to delete.')
      return
    }

    setEditorMessage(null)
  }, [closeDeleteDialog, editorInteractionsEnabled, sceneRef])

  return {
    addFurniture,
    catalogIdToAdd,
    closeDeleteDialog,
    closeOpenDialogs,
    confirmDeleteSelection,
    editorMessage,
    getIsModalOpen,
    handleHistoryChange,
    handleSelectionChange,
    isCatalogDrawerOpen,
    historyAvailability,
    isDeleteDialogOpen,
    isInfoDialogOpen,
    openDeleteDialog,
    pendingDeleteFurniture,
    redo,
    resetEditorShellState,
    rotateSelection,
    selectedFurniture,
    setCatalogDrawerOpen,
    setInfoDialogOpen,
    setCatalogIdToAdd,
    undo,
  }
}
