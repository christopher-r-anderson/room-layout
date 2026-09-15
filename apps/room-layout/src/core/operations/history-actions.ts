import { msg } from '@lingui/core/macro'
import { feedback } from '@/core/stores/feedback-store'
import { useSelectionStore } from '@/core/stores/selection-store'
import { sceneCommands } from '@/core/scene-commands'
import { requestFocus } from '@/core/operations/focus-actions'
import type { GestureModality } from '@/core/operations/focus-policy'
import { redo as redoDocument, undo as undoDocument } from './history-mutations'
import { i18n } from '@/shared/i18n/i18n'

// Undo/redo reconcile the selection pointer against the restored items; when
// that moves the selection, a focus intent follows it ("focus the item that
// now matters") and the resolver decides whether and where focus lands.
function focusReconciledSelection(
  previousSelectedId: string | null,
  modality: GestureModality,
) {
  const { selectedId } = useSelectionStore.getState()

  if (selectedId === previousSelectedId) {
    return
  }

  requestFocus(
    { kind: 'selected-item', operation: 'history', targetItemId: selectedId },
    { modality },
  )
}

export function undo(modality: GestureModality) {
  const previousSelectedId = useSelectionStore.getState().selectedId
  const undid = sceneCommands.isSceneReady() ? undoDocument() : false

  if (undid) {
    feedback.interactionUpdate(i18n._(msg`Undo complete.`))
    focusReconciledSelection(previousSelectedId, modality)
  }
}

export function redo(modality: GestureModality) {
  const previousSelectedId = useSelectionStore.getState().selectedId
  const redid = sceneCommands.isSceneReady() ? redoDocument() : false

  if (redid) {
    feedback.interactionUpdate(i18n._(msg`Redo complete.`))
    focusReconciledSelection(previousSelectedId, modality)
  }
}
