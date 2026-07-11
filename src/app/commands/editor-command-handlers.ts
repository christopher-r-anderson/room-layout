import {
  runEditorCommand,
  type EditorCommand,
  type EditorCommandHandlers,
} from '@/core/commands/editor-command'
import {
  focusInspector,
  focusItemActions,
  focusItemCollection,
  focusScene,
} from '@/core/operations/focus-actions'
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

/**
 * The concrete editor command map: every kind wires straight to a core
 * operation or feature action. No command semantics are invented here.
 */
const EDITOR_COMMAND_HANDLERS: EditorCommandHandlers = {
  'focus-inspector': focusInspector,
  'focus-room-view': focusScene,
  'focus-outliner': focusItemCollection,
  'focus-item-actions': focusItemActions,
  undo: (command) => {
    undo(command.modality)
  },
  redo: (command) => {
    redo(command.modality)
  },
  'start-over': startOverIntent,
  'open-delete-dialog': (command) => {
    openDeleteDialog(command.originSurface)
  },
  'focus-selected': focusSelectedInView,
  'move-selection': (command) => {
    moveSelection(command.delta)
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

export function dispatchEditorCommand(command: EditorCommand): void {
  runEditorCommand(command, EDITOR_COMMAND_HANDLERS)
}
