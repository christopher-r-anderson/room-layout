import type { CameraPreset } from '@/core/scene.types'
import type { GestureModality } from '@/core/operations/focus-policy'

type RotationDirection = -1 | 1

type CanvasBrowseDirection = 'next' | 'prev' | 'first' | 'last'

/** The two surfaces a delete gesture can structurally come from. */
export type DeleteOriginSurface = 'scene' | 'item-actions'

interface MoveSelectionDelta {
  x: number
  z: number
}

export type EditorCommand =
  | { kind: 'undo'; modality: GestureModality }
  | { kind: 'redo'; modality: GestureModality }
  | { kind: 'start-over' }
  | { kind: 'focus-inspector' }
  | { kind: 'focus-room-view' }
  | { kind: 'focus-outliner' }
  | { kind: 'focus-toolbar' }
  | { kind: 'focus-selected' }
  | { kind: 'canvas-select-previewed' }
  | { kind: 'clear-selection' }
  | { kind: 'share' }
  | { kind: 'set-camera-preset'; preset: CameraPreset }
  | { kind: 'move-selection'; delta: MoveSelectionDelta }
  | { kind: 'rotate-selection'; direction: RotationDirection }
  | { kind: 'canvas-browse'; direction: CanvasBrowseDirection }
  | { kind: 'open-delete-dialog'; originSurface: DeleteOriginSurface }

/**
 * One handler per command kind, each receiving its exact command variant. The
 * mapped type is keyed by `kind`, so adding a command to the union forces a
 * matching handler here — no parallel interface or dispatch switch to maintain.
 */
export type EditorCommandHandlers = {
  [Kind in EditorCommand['kind']]: (
    command: Extract<EditorCommand, { kind: Kind }>,
  ) => void
}

export function runEditorCommand(
  command: EditorCommand,
  handlers: EditorCommandHandlers,
): void {
  const handler = handlers[command.kind] as (command: EditorCommand) => void
  handler(command)
}
