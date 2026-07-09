import { useCallback } from 'react'
import { msg } from '@lingui/core/macro'
import { feedback } from '@/core/stores/feedback-store'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { selectionActions } from '@/core/stores/selection-store'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { requestOutlinerFocus } from '@/core/operations/focus-actions'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { i18n } from '@/shared/i18n/i18n'

const NO_SELECTION_FOCUS_FALLBACK = msg`No item selected. Focus moved to Furniture in room.`

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
  const selectedFurniture = useSelectedFurniture()

  const focusInspector = useCallback(() => {
    if (selectedFurniture === null) {
      requestOutlinerFocus()
      feedback.interactionUpdate(i18n._(NO_SELECTION_FOCUS_FALLBACK))
      return
    }

    const firstFocusableControl = findFirstFocusableControl(
      detailsPanelRef.current,
    )

    firstFocusableControl?.focus()
  }, [detailsPanelRef, selectedFurniture])

  const focusRoomView = useCallback(() => {
    selectionActions.requestRoomViewFocus()

    if (selectedFurniture !== null) {
      previewFromCanvasKeyboard(selectedFurniture.id)
    }
  }, [selectedFurniture])

  const focusOutliner = useCallback(() => {
    requestOutlinerFocus()
  }, [])

  const focusToolbar = useCallback(() => {
    if (selectedFurniture === null) {
      requestOutlinerFocus()
      feedback.interactionUpdate(i18n._(NO_SELECTION_FOCUS_FALLBACK))
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
  }, [detailsPanelRef, selectedToolbarRef, selectedFurniture])

  return { focusInspector, focusRoomView, focusOutliner, focusToolbar }
}
