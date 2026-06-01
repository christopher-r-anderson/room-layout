import { useCallback } from 'react'
import type {
  DialogOpenOptions,
  DialogStateSnapshot,
} from '@/editor-state/dialog-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import { clearSceneDraft } from '@/app/url-scene/scene-draft'
import { toast } from 'sonner'
import type { SelectionEffectsApi } from './use-scene-selection-effects'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
}

interface StartOverControllerOptions {
  announcements: AnnouncementsApi
  dialogState: Pick<DialogStateSnapshot, 'closeDialog' | 'openStartOver'>
  selectionEffects: SelectionEffectsApi
  clearPreview: () => void
  defaults: {
    floorFinishId: string
    wallFinishId: string
  }
}

export function useStartOverController({
  announcements,
  dialogState,
  selectionEffects,
  clearPreview,
  defaults,
}: StartOverControllerOptions) {
  const { announcePolite } = announcements

  const handleOpenStartOverDialog = useCallback(
    (options?: DialogOpenOptions) => {
      const opened = dialogState.openStartOver(options)

      if (opened) {
        sceneStateActions.clearEditorMessage()
      }
    },
    [dialogState],
  )

  const handleConfirmStartOver = useCallback(() => {
    dialogState.closeDialog()
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
    dialogState,
    selectionEffects,
  ])

  return {
    handleOpenStartOverDialog,
    handleConfirmStartOver,
  }
}
