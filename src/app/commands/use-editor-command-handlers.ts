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
import { shareScene } from '@/core/operations/share-scene'
import {
  browseCanvasPreview,
  selectCanvasPreviewed,
} from '@/core/operations/canvas-keyboard-actions'
import { useEditorFocusCommands } from './use-editor-focus-commands'

/**
 * Assembles the concrete editor command map: most kinds wire straight to a core
 * operation or feature action; the view-bound focus impls come from
 * useEditorFocusCommands (which reads the editor refs from context). No command
 * semantics are invented here.
 */
export function useEditorCommandHandlers(): EditorCommandHandlers {
  const focus = useEditorFocusCommands()

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
      browseCanvasPreview(command.direction)
    },
    'canvas-select-previewed': selectCanvasPreviewed,
    share: () => {
      void shareScene()
    },
  }
}
