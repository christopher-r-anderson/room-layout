import { useCallback } from 'react'
import type { DialogOpenRequest } from '@/editor-state/dialog-contract'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import { clearSceneDraft } from '@/features/url-scene/scene-draft'
import { toast } from 'sonner'
import type { SelectionEffectsApi } from './use-selection-effects-controller'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
}

interface StartOverControllerOptions {
  announcements: AnnouncementsApi
  closeActiveDialog: () => void
  openStartOverDialog: (request?: DialogOpenRequest) => boolean
  canStartOver: boolean
  selectionEffects: SelectionEffectsApi
  clearPreview: () => void
  defaults: {
    floorFinishId: string
    wallFinishId: string
  }
}

export function useStartOverController({
  announcements,
  closeActiveDialog,
  openStartOverDialog,
  canStartOver,
  selectionEffects,
  clearPreview,
  defaults,
}: StartOverControllerOptions) {
  const { announcePolite } = announcements

  const handleOpenStartOverDialog = useCallback(
    (request?: DialogOpenRequest) => {
      if (!canStartOver) {
        return
      }

      const opened = openStartOverDialog(request)

      if (opened) {
        sceneStateActions.clearEditorMessage()
      }
    },
    [canStartOver, openStartOverDialog],
  )

  const handleConfirmStartOver = useCallback(() => {
    closeActiveDialog()
    clearPreview()
    sceneStateActions.clearEditorMessage()
    sceneCommands.restoreInitialLayout([])
    sceneStateActions.setFloorFinishId(defaults.floorFinishId)
    sceneStateActions.setWallFinishId(defaults.wallFinishId)
    if (sceneCommands.isSceneReady()) {
      sceneCommands.setCameraPreset('corner')
    }
    clearSceneDraft()
    selectionEffects.notePendingSelection({
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    })
    announcePolite('Started over. Your changes were cleared.')
    toast.success('Started over. Your changes were cleared.')
  }, [
    announcePolite,
    clearPreview,
    defaults.floorFinishId,
    defaults.wallFinishId,
    closeActiveDialog,
    selectionEffects,
  ])

  return {
    handleOpenStartOverDialog,
    handleConfirmStartOver,
  }
}
