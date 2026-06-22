import { useCallback } from 'react'
import type { AppDialogOpenRequest } from '@/app/dialogs/dialog-requests'
import { announcementActions } from '@/editor-state/announcement-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import { clearSceneDraft } from '@/features/url-scene/scene-draft'
import { toast } from 'sonner'
import { selectionEffects } from '@/editor-state/selection-effects'

interface StartOverControllerOptions {
  closeActiveDialog: () => void
  openStartOverDialog: (request?: AppDialogOpenRequest) => boolean
  canStartOver: boolean
  clearPreview: () => void
  defaults: {
    floorFinishId: string
    wallFinishId: string
  }
}

export function useStartOverController({
  closeActiveDialog,
  openStartOverDialog,
  canStartOver,
  clearPreview,
  defaults,
}: StartOverControllerOptions) {
  const handleOpenStartOverDialog = useCallback(
    (request?: AppDialogOpenRequest) => {
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
    announcementActions.announcePolite(
      'Started over. Your changes were cleared.',
    )
    toast.success('Started over. Your changes were cleared.')
  }, [
    clearPreview,
    defaults.floorFinishId,
    defaults.wallFinishId,
    closeActiveDialog,
  ])

  return {
    handleOpenStartOverDialog,
    handleConfirmStartOver,
  }
}
