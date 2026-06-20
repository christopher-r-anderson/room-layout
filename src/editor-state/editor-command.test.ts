import { describe, expect, it, vi } from 'vitest'
import {
  runEditorCommand,
  type EditorCommand,
  type EditorCommandApi,
} from './editor-command'

function createMockCommandApi(): EditorCommandApi {
  return {
    focusInspector: vi.fn(),
    focusRoomView: vi.fn(),
    focusOutliner: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    startOverIntent: vi.fn(),
    openDeleteDialog: vi.fn(),
    focusSelected: vi.fn(),
    moveSelection: vi.fn(),
    clearSelection: vi.fn(),
    rotate: vi.fn(),
    setCameraPreset: vi.fn(),
    canvasBrowse: vi.fn(),
    canvasSelectPreviewed: vi.fn(),
    share: vi.fn(),
  }
}

describe('runEditorCommand', () => {
  it.each<[EditorCommand, keyof EditorCommandApi]>([
    [{ kind: 'undo' }, 'undo'],
    [{ kind: 'redo' }, 'redo'],
    [{ kind: 'start-over' }, 'startOverIntent'],
    [{ kind: 'focus-inspector' }, 'focusInspector'],
    [{ kind: 'focus-room-view' }, 'focusRoomView'],
    [{ kind: 'focus-outliner' }, 'focusOutliner'],
    [{ kind: 'focus-selected' }, 'focusSelected'],
    [{ kind: 'canvas-select-previewed' }, 'canvasSelectPreviewed'],
    [{ kind: 'clear-selection' }, 'clearSelection'],
    [{ kind: 'share' }, 'share'],
  ])('routes %o to the matching no-arg api method', (command, method) => {
    const api = createMockCommandApi()

    runEditorCommand(command, api)

    expect(api[method]).toHaveBeenCalledTimes(1)
    expect(api[method]).toHaveBeenCalledWith()
  })

  it('routes set-camera-preset with the preset argument', () => {
    const api = createMockCommandApi()

    runEditorCommand({ kind: 'set-camera-preset', preset: 'side' }, api)

    expect(api.setCameraPreset).toHaveBeenCalledTimes(1)
    expect(api.setCameraPreset).toHaveBeenCalledWith('side')
  })

  it('routes move-selection with the delta argument', () => {
    const api = createMockCommandApi()

    runEditorCommand({ kind: 'move-selection', delta: { x: -1, z: 0 } }, api)

    expect(api.moveSelection).toHaveBeenCalledTimes(1)
    expect(api.moveSelection).toHaveBeenCalledWith({ x: -1, z: 0 })
  })

  it('routes rotate-selection with the direction argument', () => {
    const api = createMockCommandApi()

    runEditorCommand({ kind: 'rotate-selection', direction: -1 }, api)

    expect(api.rotate).toHaveBeenCalledTimes(1)
    expect(api.rotate).toHaveBeenCalledWith(-1)
  })

  it('routes canvas-browse with the direction argument', () => {
    const api = createMockCommandApi()

    runEditorCommand({ kind: 'canvas-browse', direction: 'last' }, api)

    expect(api.canvasBrowse).toHaveBeenCalledTimes(1)
    expect(api.canvasBrowse).toHaveBeenCalledWith('last')
  })

  it('routes open-delete-dialog with the room-view return focus', () => {
    const api = createMockCommandApi()

    runEditorCommand(
      { kind: 'open-delete-dialog', returnFocusTo: 'room-view' },
      api,
    )

    expect(api.openDeleteDialog).toHaveBeenCalledTimes(1)
    expect(api.openDeleteDialog).toHaveBeenCalledWith('room-view')
  })

  it('routes open-delete-dialog with the outliner return focus', () => {
    const api = createMockCommandApi()

    runEditorCommand(
      { kind: 'open-delete-dialog', returnFocusTo: 'outliner' },
      api,
    )

    expect(api.openDeleteDialog).toHaveBeenCalledWith('outliner')
  })
})
