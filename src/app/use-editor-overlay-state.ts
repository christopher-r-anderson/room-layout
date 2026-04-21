import { useCallback, useState, type RefObject } from 'react'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneRef } from '@/scene/scene.types'

interface HistoryAvailability {
  canUndo: boolean
  canRedo: boolean
}

interface UseEditorOverlayStateOptions {
  confirmDeleteDialogRef: RefObject<HTMLDialogElement | null>
  editorInteractionsEnabledRef: RefObject<boolean>
  infoButtonRef: RefObject<HTMLButtonElement | null>
  infoDialogRef: RefObject<HTMLDialogElement | null>
  pickerDialogRef: RefObject<HTMLDialogElement | null>
  removeButtonRef: RefObject<HTMLButtonElement | null>
  rotationStepRadians: number
  sceneRef: RefObject<SceneRef | null>
  startupOverlayActiveRef: RefObject<boolean>
}

interface EditorOverlayState {
  addFurniture: () => void
  catalogIdToAdd: string
  closeDeleteDialog: () => void
  closeInfoDialog: () => void
  closePicker: () => void
  closeOpenDialogs: () => void
  confirmRemoveSelection: () => void
  editorMessage: string | null
  getIsModalOpen: () => boolean
  handleDeleteDialogCancel: (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => void
  handleDeleteDialogClick: (event: React.MouseEvent<HTMLDialogElement>) => void
  handleHistoryChange: (availability: HistoryAvailability) => void
  handleInfoDialogCancel: (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => void
  handleInfoDialogClick: (event: React.MouseEvent<HTMLDialogElement>) => void
  handleSelectionChange: (item: FurnitureItem | null) => void
  historyAvailability: HistoryAvailability
  isPickerOpen: boolean
  openDeleteDialog: () => void
  openPicker: () => void
  openInfoDialog: () => void
  pendingDeleteFurniture: FurnitureItem | null
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
  confirmDeleteDialogRef,
  editorInteractionsEnabledRef,
  infoButtonRef,
  infoDialogRef,
  pickerDialogRef,
  removeButtonRef,
  rotationStepRadians,
  sceneRef,
  startupOverlayActiveRef,
}: UseEditorOverlayStateOptions): EditorOverlayState {
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [catalogIdToAdd, setCatalogIdToAdd] = useState(
    FURNITURE_CATALOG[0]?.id ?? '',
  )
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)
  const [editorMessage, setEditorMessage] = useState<string | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
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
    setIsPickerOpen(false)
    setHistoryAvailability(INITIAL_HISTORY_AVAILABILITY)
  }, [sceneRef])

  const closeOpenDialogs = useCallback(() => {
    confirmDeleteDialogRef.current?.close()
    infoDialogRef.current?.close()
    pickerDialogRef.current?.close()
    setIsPickerOpen(false)
  }, [confirmDeleteDialogRef, infoDialogRef, pickerDialogRef])

  const closeDeleteDialog = useCallback(() => {
    confirmDeleteDialogRef.current?.close()
    setPendingDeleteFurniture(null)
    removeButtonRef.current?.focus()
  }, [confirmDeleteDialogRef, removeButtonRef])

  const openPicker = useCallback(() => {
    if (
      !editorInteractionsEnabledRef.current ||
      pickerDialogRef.current?.open ||
      confirmDeleteDialogRef.current?.open ||
      infoDialogRef.current?.open
    ) {
      return
    }

    setEditorMessage(null)
    setIsPickerOpen(true)
  }, [
    confirmDeleteDialogRef,
    editorInteractionsEnabledRef,
    infoDialogRef,
    pickerDialogRef,
  ])

  const closePicker = useCallback(() => {
    setIsPickerOpen(false)
  }, [])

  const openDeleteDialog = useCallback(() => {
    if (
      !editorInteractionsEnabledRef.current ||
      !selectedFurniture ||
      confirmDeleteDialogRef.current?.open
    ) {
      return
    }

    setPendingDeleteFurniture(selectedFurniture)
    setEditorMessage(null)
    confirmDeleteDialogRef.current?.showModal()
  }, [confirmDeleteDialogRef, editorInteractionsEnabledRef, selectedFurniture])

  const rotateSelection = useCallback(
    (direction: -1 | 1) => {
      if (!editorInteractionsEnabledRef.current) {
        return
      }

      sceneRef.current?.rotateSelection(direction * rotationStepRadians)
    },
    [editorInteractionsEnabledRef, rotationStepRadians, sceneRef],
  )

  const undo = useCallback(() => {
    if (!editorInteractionsEnabledRef.current) {
      return
    }

    sceneRef.current?.undo()
  }, [editorInteractionsEnabledRef, sceneRef])

  const redo = useCallback(() => {
    if (!editorInteractionsEnabledRef.current) {
      return
    }

    sceneRef.current?.redo()
  }, [editorInteractionsEnabledRef, sceneRef])

  const getIsModalOpen = useCallback(() => {
    return (
      isPickerOpen ||
      Boolean(infoDialogRef.current?.open) ||
      Boolean(confirmDeleteDialogRef.current?.open) ||
      Boolean(pickerDialogRef.current?.open)
    )
  }, [confirmDeleteDialogRef, infoDialogRef, isPickerOpen, pickerDialogRef])

  const addFurniture = useCallback(() => {
    if (!editorInteractionsEnabledRef.current || !catalogIdToAdd) {
      return
    }

    const result = sceneRef.current?.addFurniture(catalogIdToAdd)

    if (!result) {
      return
    }

    if (!result.ok) {
      setEditorMessage(
        result.reason === 'no-space'
          ? 'No safe placement slot is available for that furniture item.'
          : 'The selected furniture entry is no longer available.',
      )
      return
    }

    setEditorMessage(null)
    setIsPickerOpen(false)
  }, [catalogIdToAdd, editorInteractionsEnabledRef, sceneRef])

  const openInfoDialog = useCallback(() => {
    if (startupOverlayActiveRef.current) {
      return
    }

    infoDialogRef.current?.showModal()
  }, [infoDialogRef, startupOverlayActiveRef])

  const closeInfoDialog = useCallback(() => {
    infoDialogRef.current?.close()
    infoButtonRef.current?.focus()
  }, [infoButtonRef, infoDialogRef])

  const handleInfoDialogCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault()
      closeInfoDialog()
    },
    [closeInfoDialog],
  )

  const handleInfoDialogClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) {
        closeInfoDialog()
      }
    },
    [closeInfoDialog],
  )

  const handleDeleteDialogCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault()
      closeDeleteDialog()
    },
    [closeDeleteDialog],
  )

  const handleDeleteDialogClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) {
        closeDeleteDialog()
      }
    },
    [closeDeleteDialog],
  )

  const confirmRemoveSelection = useCallback(() => {
    if (!editorInteractionsEnabledRef.current) {
      return
    }

    const removed = sceneRef.current?.removeSelection() ?? false

    closeDeleteDialog()

    if (!removed) {
      setEditorMessage('No selected furniture item was available to remove.')
      return
    }

    setEditorMessage(null)
  }, [closeDeleteDialog, editorInteractionsEnabledRef, sceneRef])

  return {
    addFurniture,
    catalogIdToAdd,
    closeDeleteDialog,
    closeInfoDialog,
    closePicker,
    closeOpenDialogs,
    confirmRemoveSelection,
    editorMessage,
    getIsModalOpen,
    handleDeleteDialogCancel,
    handleDeleteDialogClick,
    handleHistoryChange,
    handleInfoDialogCancel,
    handleInfoDialogClick,
    handleSelectionChange,
    historyAvailability,
    isPickerOpen,
    openDeleteDialog,
    openPicker,
    openInfoDialog,
    pendingDeleteFurniture,
    redo,
    resetEditorShellState,
    rotateSelection,
    selectedFurniture,
    setCatalogIdToAdd,
    undo,
  }
}
