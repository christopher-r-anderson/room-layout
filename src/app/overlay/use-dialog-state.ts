import { useCallback, useState } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

type ActiveDialog = 'catalog' | 'delete' | 'info' | null

interface UseDialogStateOptions {
  editorInteractionsEnabled: boolean
  startupOverlayActive: boolean
  selectedFurniture: FurnitureItem | null
}

interface DialogState {
  activeDialog: ActiveDialog
  isCatalogDrawerOpen: boolean
  isDeleteDialogOpen: boolean
  isInfoDialogOpen: boolean
  isModalOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  openCatalog: () => boolean
  openDelete: () => boolean
  openInfo: () => boolean
  closeDialog: () => void
  closeAllDialogs: () => void
  setCatalogOpen: (open: boolean) => boolean
  setInfoOpen: (open: boolean) => boolean
}

export function useDialogState({
  editorInteractionsEnabled,
  startupOverlayActive,
  selectedFurniture,
}: UseDialogStateOptions): DialogState {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)

  const isCatalogDrawerOpen = activeDialog === 'catalog'
  const isDeleteDialogOpen = activeDialog === 'delete'
  const isInfoDialogOpen = activeDialog === 'info'
  const isModalOpen = activeDialog !== null

  const closeDialog = useCallback(() => {
    setActiveDialog(null)
    setPendingDeleteFurniture(null)
  }, [])

  const closeAllDialogs = useCallback(() => {
    closeDialog()
  }, [closeDialog])

  const openCatalog = useCallback(() => {
    if (!editorInteractionsEnabled || activeDialog !== null) {
      return false
    }

    setActiveDialog('catalog')
    return true
  }, [activeDialog, editorInteractionsEnabled])

  const openInfo = useCallback(() => {
    if (startupOverlayActive || activeDialog !== null) {
      return false
    }

    setActiveDialog('info')
    return true
  }, [activeDialog, startupOverlayActive])

  const openDelete = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      !selectedFurniture ||
      activeDialog !== null
    ) {
      return false
    }

    setPendingDeleteFurniture(selectedFurniture)
    setActiveDialog('delete')
    return true
  }, [activeDialog, editorInteractionsEnabled, selectedFurniture])

  const setCatalogOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openCatalog()
    },
    [closeDialog, openCatalog],
  )

  const setInfoOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openInfo()
    },
    [closeDialog, openInfo],
  )

  return {
    activeDialog,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isInfoDialogOpen,
    isModalOpen,
    pendingDeleteFurniture,
    openCatalog,
    openDelete,
    openInfo,
    closeDialog,
    closeAllDialogs,
    setCatalogOpen,
    setInfoOpen,
  }
}
