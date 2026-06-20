import type { CameraPreset } from '@/scene/scene.types'

type RotationDirection = -1 | 1

type CanvasBrowseDirection = 'next' | 'prev' | 'first' | 'last'

type DeleteDialogReturnFocus = 'room-view' | 'outliner'

interface MoveSelectionDelta {
  x: number
  z: number
}

export type EditorCommand =
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'start-over' }
  | { kind: 'focus-inspector' }
  | { kind: 'focus-room-view' }
  | { kind: 'focus-outliner' }
  | { kind: 'focus-selected' }
  | { kind: 'canvas-select-previewed' }
  | { kind: 'clear-selection' }
  | { kind: 'share' }
  | { kind: 'set-camera-preset'; preset: CameraPreset }
  | { kind: 'move-selection'; delta: MoveSelectionDelta }
  | { kind: 'rotate-selection'; direction: RotationDirection }
  | { kind: 'canvas-browse'; direction: CanvasBrowseDirection }
  | { kind: 'open-delete-dialog'; returnFocusTo: DeleteDialogReturnFocus }

export interface EditorCommandApi {
  focusInspector: () => void
  focusRoomView: () => void
  focusOutliner: () => void
  undo: () => void
  redo: () => void
  startOverIntent: () => void
  openDeleteDialog: (returnFocusTo: DeleteDialogReturnFocus) => void
  focusSelected: () => void
  moveSelection: (delta: MoveSelectionDelta) => void
  clearSelection: () => void
  rotate: (direction: RotationDirection) => void
  setCameraPreset: (preset: CameraPreset) => void
  canvasBrowse: (direction: CanvasBrowseDirection) => void
  canvasSelectPreviewed: () => void
  share: () => void
}

export function runEditorCommand(
  command: EditorCommand,
  api: EditorCommandApi,
): void {
  switch (command.kind) {
    case 'undo':
      api.undo()
      return
    case 'redo':
      api.redo()
      return
    case 'start-over':
      api.startOverIntent()
      return
    case 'focus-inspector':
      api.focusInspector()
      return
    case 'focus-room-view':
      api.focusRoomView()
      return
    case 'focus-outliner':
      api.focusOutliner()
      return
    case 'focus-selected':
      api.focusSelected()
      return
    case 'canvas-select-previewed':
      api.canvasSelectPreviewed()
      return
    case 'clear-selection':
      api.clearSelection()
      return
    case 'share':
      api.share()
      return
    case 'set-camera-preset':
      api.setCameraPreset(command.preset)
      return
    case 'move-selection':
      api.moveSelection(command.delta)
      return
    case 'rotate-selection':
      api.rotate(command.direction)
      return
    case 'canvas-browse':
      api.canvasBrowse(command.direction)
      return
    case 'open-delete-dialog':
      api.openDeleteDialog(command.returnFocusTo)
      return
    default: {
      const unhandled: never = command
      throw new Error(`Unhandled editor command: ${JSON.stringify(unhandled)}`)
    }
  }
}
