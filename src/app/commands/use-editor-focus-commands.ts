import { useCallback } from 'react'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { requestFocus } from '@/core/operations/focus-actions'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'

// Excludes tabindex="-1" on every clause, not just the [tabindex] one, so in a
// roving-tabindex toolbar the query lands on the active (tabindex="0") item
// rather than the first DOM button (which may be roving-inactive).
const FOCUSABLE_CONTROL_SELECTOR =
  'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'

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
 * The focus-routing command implementations. Scene and outliner routing go
 * through the focus resolver as surface intents (which also owns the
 * no-selection fallback and its announcement); the inspector and item toolbar
 * still reach through the editor refs while they lack directive consumers.
 */
export function useEditorFocusCommands(): EditorFocusCommands {
  const { detailsPanelRef, selectedToolbarRef } = useEditorRefs()
  const selectedFurniture = useSelectedFurniture()

  const focusInspector = useCallback(() => {
    if (selectedFurniture === null) {
      requestFocus({ kind: 'surface', surface: 'inspector' })
      return
    }

    findFirstFocusableControl(detailsPanelRef.current)?.focus()
  }, [detailsPanelRef, selectedFurniture])

  const focusRoomView = useCallback(() => {
    requestFocus({ kind: 'surface', surface: 'scene' })

    if (selectedFurniture !== null) {
      previewFromCanvasKeyboard(selectedFurniture.id)
    }
  }, [selectedFurniture])

  const focusOutliner = useCallback(() => {
    requestFocus({ kind: 'surface', surface: 'item-collection' })
  }, [])

  const focusToolbar = useCallback(() => {
    if (selectedFurniture === null) {
      requestFocus({ kind: 'surface', surface: 'item-actions' })
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
