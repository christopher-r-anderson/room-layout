import { useCallback } from 'react'
import { feedbackActions } from '@/core/stores/feedback-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { requestOutlinerFocus } from '@/core/operations/focus-actions'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'

const FOCUSABLE_CONTROL_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function findFirstFocusableControl(root: ParentNode | null) {
  return root?.querySelector<HTMLElement>(FOCUSABLE_CONTROL_SELECTOR) ?? null
}

export interface EditorFocusCommands {
  focusInspector: () => void
  focusRoomView: () => void
  focusOutliner: () => void
  focusToolbar: () => void
}

/**
 * The focus-routing command implementations. They are view-bound (they read the
 * details-panel DOM ref from context and the current selection) so they live
 * in app, isolated here so the command map only wires them in.
 */
export function useEditorFocusCommands(): EditorFocusCommands {
  const { detailsPanelRef, selectedToolbarRef } = useEditorRefs()
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

    const firstFocusableControl = findFirstFocusableControl(
      detailsPanelRef.current,
    )

    firstFocusableControl?.focus()
  }, [detailsPanelRef, selectedFurniture, editorInteractionsEnabled])

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

  const focusToolbar = useCallback(() => {
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

    const toolbarControl = findFirstFocusableControl(selectedToolbarRef.current)

    if (toolbarControl) {
      toolbarControl.focus()
      return
    }

    // Fall back when the floating toolbar is not currently mounted; the same
    // actions are reachable in the details panel.
    findFirstFocusableControl(detailsPanelRef.current)?.focus()
  }, [
    detailsPanelRef,
    selectedToolbarRef,
    selectedFurniture,
    editorInteractionsEnabled,
  ])

  return { focusInspector, focusRoomView, focusOutliner, focusToolbar }
}
