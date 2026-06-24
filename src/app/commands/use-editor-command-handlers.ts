import type { RefObject } from 'react'
import type { EditorCommandHandlers } from '@/core/commands/editor-command'
import { redo, undo } from '@/core/operations/history-actions'
import {
  moveSelection,
  rotateSelection,
} from '@/core/operations/movement-actions'
import { clearCanvasSelection } from '@/core/operations/selection-actions'
import {
  focusSelectedInView,
  setCameraPreset,
} from '@/core/operations/view-actions'
import { openDeleteDialog } from '@/features/selection/deletion-actions'
import { startOverIntent } from '@/features/startup/start-over-actions'
import { useEditorFocusCommands } from './use-editor-focus-commands'

interface UseEditorCommandHandlersOptions {
  dockedInspectorRef: RefObject<HTMLDivElement | null>
  canvasBrowse: (direction: 'next' | 'prev' | 'first' | 'last') => void
  canvasSelectPreviewed: () => void
  shareSceneUrl: () => Promise<'shared' | 'copied' | null>
}

/**
 * Assembles the concrete editor command map: most kinds wire straight to a core
 * operation or feature action, while the genuinely view-bound impls (focus,
 * canvas browse, share) come from the controllers passed in. App owns no command
 * semantics — it only supplies the live controller closures.
 */
export function useEditorCommandHandlers({
  dockedInspectorRef,
  canvasBrowse,
  canvasSelectPreviewed,
  shareSceneUrl,
}: UseEditorCommandHandlersOptions): EditorCommandHandlers {
  const focus = useEditorFocusCommands({ dockedInspectorRef })

  return {
    'focus-inspector': focus.focusInspector,
    'focus-room-view': focus.focusRoomView,
    'focus-outliner': focus.focusOutliner,
    undo: () => {
      undo()
    },
    redo: () => {
      redo()
    },
    'start-over': startOverIntent,
    'open-delete-dialog': (command) => {
      openDeleteDialog(command.returnFocusTo)
    },
    'focus-selected': focusSelectedInView,
    'move-selection': (command) => {
      moveSelection(command.delta, { source: 'keyboard' })
    },
    'clear-selection': clearCanvasSelection,
    'rotate-selection': (command) => {
      rotateSelection(command.direction)
    },
    'set-camera-preset': (command) => {
      setCameraPreset(command.preset)
    },
    'canvas-browse': (command) => {
      canvasBrowse(command.direction)
    },
    'canvas-select-previewed': canvasSelectPreviewed,
    share: () => {
      void shareSceneUrl()
    },
  }
}
