import { useCallback, type RefObject } from 'react'
import { feedbackActions } from '@/core/stores/feedback-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { requestOutlinerFocus } from '@/core/operations/focus-actions'
import { findFirstActionableInspectorControl } from '@/app/chrome/focusable-controls'

interface UseEditorFocusCommandsOptions {
  dockedInspectorRef: RefObject<HTMLDivElement | null>
}

export interface EditorFocusCommands {
  focusInspector: () => void
  focusRoomView: () => void
  focusOutliner: () => void
}

/**
 * The focus-routing command implementations. They are view-bound (they read the
 * docked-inspector DOM ref and current selection) so they live in app rather
 * than core, but are isolated here so App only wires them into the command map.
 */
export function useEditorFocusCommands({
  dockedInspectorRef,
}: UseEditorFocusCommandsOptions): EditorFocusCommands {
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const selectedFurniture = useSelectedFurniture()

  const focusInspector = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    if (selectedFurniture === null) {
      requestOutlinerFocus()
      feedbackActions.announcePolite(
        'No item selected. Focus moved to Furniture in room.',
      )
      return
    }

    const firstFocusableControl = findFirstActionableInspectorControl(
      dockedInspectorRef.current,
    )

    firstFocusableControl?.focus()
  }, [dockedInspectorRef, selectedFurniture, editorInteractionsEnabled])

  const focusRoomView = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    selectionFocusActions.requestRoomViewFocus()

    if (selectedFurniture !== null) {
      previewFromCanvasKeyboard(selectedFurniture.id)
    }
  }, [selectedFurniture, editorInteractionsEnabled])

  const focusOutliner = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    requestOutlinerFocus()
  }, [editorInteractionsEnabled])

  return { focusInspector, focusRoomView, focusOutliner }
}
