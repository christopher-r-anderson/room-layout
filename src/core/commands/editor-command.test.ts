import { describe, expect, it, vi } from 'vitest'
import {
  runEditorCommand,
  type EditorCommand,
  type EditorCommandHandlers,
} from './editor-command'

function createMockHandlers(): EditorCommandHandlers {
  return {
    'focus-inspector': vi.fn(),
    'focus-room-view': vi.fn(),
    'focus-outliner': vi.fn(),
    'focus-toolbar': vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    'start-over': vi.fn(),
    'open-delete-dialog': vi.fn(),
    'focus-selected': vi.fn(),
    'move-selection': vi.fn(),
    'clear-selection': vi.fn(),
    'rotate-selection': vi.fn(),
    'set-camera-preset': vi.fn(),
    'canvas-browse': vi.fn(),
    'canvas-select-previewed': vi.fn(),
    share: vi.fn(),
  }
}

describe('runEditorCommand', () => {
  it.each<EditorCommand>([
    { kind: 'undo', modality: 'keyboard' },
    { kind: 'redo', modality: 'keyboard' },
    { kind: 'start-over' },
    { kind: 'focus-inspector' },
    { kind: 'focus-room-view' },
    { kind: 'focus-outliner' },
    { kind: 'focus-toolbar' },
    { kind: 'focus-selected' },
    { kind: 'canvas-select-previewed' },
    { kind: 'clear-selection' },
    { kind: 'share' },
    { kind: 'set-camera-preset', preset: 'side' },
    { kind: 'move-selection', delta: { x: -1, z: 0 } },
    { kind: 'rotate-selection', direction: -1 },
    { kind: 'canvas-browse', direction: 'last' },
    { kind: 'open-delete-dialog', originSurface: 'scene' },
  ])(
    'routes %o to the handler for its kind with the full command',
    (command) => {
      const handlers = createMockHandlers()

      runEditorCommand(command, handlers)

      expect(handlers[command.kind]).toHaveBeenCalledTimes(1)
      expect(handlers[command.kind]).toHaveBeenCalledWith(command)
    },
  )
})
