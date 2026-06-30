import { sceneDocumentStore } from '@/core/stores/scene-document-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { clearPreviewOnCanvasMiss } from '@/core/operations/preview-actions'
import { sceneCommands } from '@/scene/scene-commands'
import type { SelectByIdResult } from '@/scene/scene.types'
import type { InteractionSource } from '@/core/types/interaction.types'

export function selectByCanvasPointer(id: string) {
  const selectedId = sceneDocumentStore.getState().selectedId

  selectionEffects.notePendingSelection(
    selectedId === id
      ? null
      : {
          announceMode: 'default',
          requestOutlinerFocus: false,
        },
  )
  selectionEffects.notePendingSource(
    selectedId === id ? null : 'canvas-pointer',
  )
  selectionFocusActions.setSelectedSource('canvas-pointer')
}

export function selectById(
  id: string | null,
  source?: InteractionSource,
): SelectByIdResult {
  if (!sceneCommands.isSceneReady()) {
    return {
      ok: false,
      status: 'not-found',
    }
  }

  const selectedId = sceneDocumentStore.getState().selectedId
  const selectionWillChange = selectedId !== id
  const result = sceneCommands.selectById(id)
  feedbackActions.clearStatusMessage()

  if (result.ok && selectionWillChange) {
    selectionEffects.notePendingSelection({
      announceMode:
        source === 'panel-keyboard'
          ? 'panel-keyboard'
          : source === 'canvas-keyboard'
            ? 'canvas-keyboard'
            : 'default',
      requestOutlinerFocus: false,
    })
  } else {
    selectionEffects.notePendingSelection(null)
  }

  if (source) {
    if (result.ok && selectionWillChange) {
      selectionEffects.notePendingSource(source)
      selectionFocusActions.setSelectedSource(source)
    } else {
      selectionEffects.notePendingSource(null)
      if (result.ok) {
        selectionFocusActions.setSelectedSource(source)
      }
    }
  }

  return result
}

export function clearSelection() {
  if (!sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.clearSelection()
  selectionEffects.notePendingSelection({
    announceMode: 'default',
    requestOutlinerFocus: false,
  })
  feedbackActions.clearStatusMessage()
}

/**
 * Dismisses what is active in the room view: clears the selection and the
 * canvas-miss preview together. Shared by the Escape ("clear-selection")
 * command and a canvas pointer-miss so both paths behave identically.
 */
export function clearCanvasSelection() {
  clearSelection()
  clearPreviewOnCanvasMiss()
}
