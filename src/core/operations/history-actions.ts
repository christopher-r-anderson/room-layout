import { msg } from '@lingui/core/macro'
import { feedback } from '@/core/feedback/feedback'
import {
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import { sceneCommands } from '@/core/scene-commands'
import { redo as redoDocument, undo as undoDocument } from './history-mutations'
import { i18n } from '@/shared/i18n/i18n'

// Undo/redo reconcile the selection pointer against the restored items; when
// that moves the selection, focus follows it into the outliner (unless a focus
// request is already pending) so keyboard users land on what changed.
function focusReconciledSelection(previousSelectedId: string | null) {
  const { selectedId, outlinerFocusRequest } = useSelectionStore.getState()

  if (selectedId === previousSelectedId || outlinerFocusRequest !== null) {
    return
  }

  if (selectedId) {
    selectionActions.requestOutlinerFocus({
      token: Date.now(),
      targetSelectedId: selectedId,
    })
  } else if (previousSelectedId) {
    selectionActions.requestOutlinerFocus({
      token: Date.now(),
      focusContainer: true,
    })
  }
}

export function undo() {
  const previousSelectedId = useSelectionStore.getState().selectedId
  const undid = sceneCommands.isSceneReady() ? undoDocument() : false

  if (undid) {
    feedback.interactionUpdate(i18n._(msg`Undo complete.`))
    focusReconciledSelection(previousSelectedId)
  }
}

export function redo() {
  const previousSelectedId = useSelectionStore.getState().selectedId
  const redid = sceneCommands.isSceneReady() ? redoDocument() : false

  if (redid) {
    feedback.interactionUpdate(i18n._(msg`Redo complete.`))
    focusReconciledSelection(previousSelectedId)
  }
}
