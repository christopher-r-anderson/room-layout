// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
  sceneStateStore,
} from '@/editor-state/scene-state-store'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
} from '@/editor-state/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/app/hooks/command-messages'
import { useDeletionController } from './use-deletion-controller'

const CHAIR = {
  id: 'chair-1',
  catalogId: 'chair',
  collectionId: 'collection-1',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair' as const,
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

function createSelectionEffects() {
  return {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn().mockReturnValue(null),
  }
}

function createDialogState(overrides?: {
  pendingDeleteFurniture?: typeof CHAIR | null
}) {
  return {
    closeDialog: vi.fn(),
    openDelete: vi.fn().mockReturnValue(true),
    pendingDeleteFurniture:
      overrides?.pendingDeleteFurniture === undefined
        ? CHAIR
        : overrides.pendingDeleteFurniture,
  }
}

describe('useDeletionController', () => {
  beforeEach(() => {
    resetSceneStateStore()
    resetSelectionMetaStore()
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the missing-selection message and skips delete when scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const deleteSelection = vi.spyOn(sceneCommands, 'deleteSelection')
    const announcements = { announcePolite: vi.fn() }
    const dialogState = createDialogState()
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements,
        dialogState,
        editorInteractionsEnabled: true,
        selectionEffects,
        focusRoomView: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleConfirmDeleteSelection()
    })

    expect(dialogState.closeDialog).toHaveBeenCalled()
    expect(deleteSelection).not.toHaveBeenCalled()
    expect(sceneStateStore.getState().editorMessage).toBe(
      DELETE_SELECTION_MISSING_MESSAGE,
    )
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })

  it('skips delete without writing an editor message when interactions are disabled', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const deleteSelection = vi.spyOn(sceneCommands, 'deleteSelection')
    const announcements = { announcePolite: vi.fn() }
    const dialogState = createDialogState()
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements,
        dialogState,
        editorInteractionsEnabled: false,
        selectionEffects,
        focusRoomView: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleConfirmDeleteSelection()
    })

    expect(dialogState.closeDialog).toHaveBeenCalled()
    expect(deleteSelection).not.toHaveBeenCalled()
    expect(sceneStateStore.getState().editorMessage).toBeNull()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })

  it('focuses the room view after delete when canvas was the source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'deleteSelection').mockReturnValue(true)
    selectionMetaActions.setSelectedSource('canvas-keyboard')
    const focusRoomView = vi.fn()
    const announcements = { announcePolite: vi.fn() }
    const dialogState = createDialogState()
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements,
        dialogState,
        editorInteractionsEnabled: true,
        selectionEffects,
        focusRoomView,
      }),
    )

    act(() => {
      result.current.handleConfirmDeleteSelection()
    })

    expect(focusRoomView).toHaveBeenCalled()
    expect(
      selectionEffects.notePostDeleteOutlinerFocusIndex,
    ).toHaveBeenCalledWith(null)
    expect(announcements.announcePolite).toHaveBeenCalledWith(
      `${CHAIR.name} removed from room.`,
    )
  })

  it('queues outliner focus restore index when not a canvas source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'deleteSelection').mockReturnValue(true)
    selectionMetaActions.setSelectedSource('panel-keyboard')
    const focusRoomView = vi.fn()
    const dialogState = createDialogState()
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements: { announcePolite: vi.fn() },
        dialogState,
        editorInteractionsEnabled: true,
        selectionEffects,
        focusRoomView,
      }),
    )

    act(() => {
      result.current.handleConfirmDeleteSelection()
    })

    expect(focusRoomView).not.toHaveBeenCalled()
    expect(
      selectionEffects.notePostDeleteOutlinerFocusIndex,
    ).toHaveBeenCalledWith(0)
  })

  it('records post-delete focus target on open from outliner', () => {
    const dialogState = createDialogState()
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements: { announcePolite: vi.fn() },
        dialogState,
        editorInteractionsEnabled: true,
        selectionEffects,
        focusRoomView: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleOpenDeleteDialog()
    })

    expect(selectionEffects.notePostDeleteFocusTarget).toHaveBeenCalledWith(
      'outliner',
    )
  })

  it('records room-view focus target on open from room view', () => {
    const dialogState = createDialogState()
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements: { announcePolite: vi.fn() },
        dialogState,
        editorInteractionsEnabled: true,
        selectionEffects,
        focusRoomView: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleOpenDeleteDialogFromRoomView()
    })

    expect(selectionEffects.notePostDeleteFocusTarget).toHaveBeenCalledWith(
      'room-view',
    )
  })

  it('clears the post-delete target when the dialog refuses to open', () => {
    const dialogState = createDialogState()
    dialogState.openDelete.mockReturnValue(false)
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useDeletionController({
        announcements: { announcePolite: vi.fn() },
        dialogState,
        editorInteractionsEnabled: true,
        selectionEffects,
        focusRoomView: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleOpenDeleteDialog()
    })

    expect(selectionEffects.notePostDeleteFocusTarget).toHaveBeenCalledWith(
      null,
    )
  })
})
