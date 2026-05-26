import { useCallback, useState } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

type ActiveDialog =
  | 'catalog'
  | 'delete'
  | 'environment'
  | 'info'
  | 'new-scene'
  | null

interface UseDialogStateOptions {
  editorInteractionsEnabled: boolean
  startupOverlayActive: boolean
  selectedFurniture: FurnitureItem | null
  canStartNewScene: boolean
}

interface DialogState {
  activeDialog: ActiveDialog
  isCatalogDrawerOpen: boolean
  isDeleteDialogOpen: boolean
  isEnvironmentDialogOpen: boolean
  isInfoDialogOpen: boolean
  isNewSceneDialogOpen: boolean
  isModalOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  openCatalog: () => boolean
  openDelete: () => boolean
  openEnvironment: () => boolean
  openInfo: () => boolean
  openNewScene: () => boolean
  closeDialog: () => void
  closeAllDialogs: () => void
  setCatalogOpen: (open: boolean) => boolean
  setEnvironmentOpen: (open: boolean) => boolean
  setInfoOpen: (open: boolean) => boolean
}

export function useDialogState({
  editorInteractionsEnabled,
  startupOverlayActive,
  selectedFurniture,
  canStartNewScene,
}: UseDialogStateOptions): DialogState {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)

  const isCatalogDrawerOpen = activeDialog === 'catalog'
  const isDeleteDialogOpen = activeDialog === 'delete'
  const isEnvironmentDialogOpen = activeDialog === 'environment'
  const isInfoDialogOpen = activeDialog === 'info'
  const isNewSceneDialogOpen = activeDialog === 'new-scene'
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

  const openEnvironment = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      startupOverlayActive ||
      activeDialog !== null
    ) {
      return false
    }

    setActiveDialog('environment')
    return true
  }, [activeDialog, editorInteractionsEnabled, startupOverlayActive])

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

  const openNewScene = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      activeDialog !== null ||
      !canStartNewScene
    ) {
      return false
    }

    setActiveDialog('new-scene')
    return true
  }, [activeDialog, editorInteractionsEnabled, canStartNewScene])

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

  const setEnvironmentOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openEnvironment()
    },
    [closeDialog, openEnvironment],
  )

  return {
    activeDialog,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isEnvironmentDialogOpen,
    isInfoDialogOpen,
    isNewSceneDialogOpen,
    isModalOpen,
    pendingDeleteFurniture,
    openCatalog,
    openDelete,
    openEnvironment,
    openInfo,
    openNewScene,
    closeDialog,
    closeAllDialogs,
    setCatalogOpen,
    setEnvironmentOpen,
    setInfoOpen,
  }
}
