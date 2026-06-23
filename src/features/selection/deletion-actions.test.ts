// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
  sceneStateStore,
} from '@/core/stores/scene-state-store'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  selectionMetaStore,
} from '@/core/stores/selection-meta-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { sceneCommands } from '@/scene/scene-commands'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import { announcementActions } from '@/core/stores/announcement-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import {
  confirmDeleteSelection,
  openDeleteDialog,
  openDeleteDialogFromRoomView,
} from './deletion-actions'

vi.mock('@/core/stores/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

vi.mock('@/core/operations/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn().mockReturnValue(null),
  },
}))

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

beforeEach(() => {
  resetSceneStateStore()
  resetSelectionMetaStore()
  resetEditorLifecycleStore()
  sceneStateActions.setHistory(createHistoryState([CHAIR]))
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('deletion-actions', () => {
  it('writes the missing-selection message and skips delete when scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const deleteSelection = vi.spyOn(sceneCommands, 'deleteSelection')
    const closeActiveDialog = vi.spyOn(dialogActions, 'closeActiveDialog')

    confirmDeleteSelection(CHAIR)

    expect(closeActiveDialog).toHaveBeenCalled()
    expect(deleteSelection).not.toHaveBeenCalled()
    expect(sceneStateStore.getState().editorMessage).toBe(
      DELETE_SELECTION_MISSING_MESSAGE,
    )
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })

  it('skips delete without writing an editor message when interactions are disabled', () => {
    resetEditorLifecycleStore()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const deleteSelection = vi.spyOn(sceneCommands, 'deleteSelection')
    const closeActiveDialog = vi.spyOn(dialogActions, 'closeActiveDialog')

    confirmDeleteSelection(CHAIR)

    expect(closeActiveDialog).toHaveBeenCalled()
    expect(deleteSelection).not.toHaveBeenCalled()
    expect(sceneStateStore.getState().editorMessage).toBeNull()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })

  it('requests room-view focus after delete when canvas was the source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'deleteSelection').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionMetaActions.setSelectedSource('canvas-keyboard')

    confirmDeleteSelection(CHAIR)

    expect(selectionMetaStore.getState().roomViewFocusRequest).toEqual(
      expect.any(Number),
    )
    expect(
      selectionEffects.notePostDeleteOutlinerFocusIndex,
    ).toHaveBeenCalledWith(null)
    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      `${CHAIR.name} removed from room.`,
    )
  })

  it('queues outliner focus restore index when not a canvas source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'deleteSelection').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionMetaActions.setSelectedSource('panel-keyboard')

    confirmDeleteSelection(CHAIR)

    expect(selectionMetaStore.getState().roomViewFocusRequest).toBeNull()
    expect(
      selectionEffects.notePostDeleteOutlinerFocusIndex,
    ).toHaveBeenCalledWith(0)
  })

  it('records post-delete focus target on open from outliner', () => {
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)

    openDeleteDialog()

    expect(selectionEffects.notePostDeleteFocusTarget).toHaveBeenCalledWith(
      'outliner',
    )
  })

  it('records room-view focus target on open from room view', () => {
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)

    openDeleteDialogFromRoomView()

    expect(selectionEffects.notePostDeleteFocusTarget).toHaveBeenCalledWith(
      'room-view',
    )
  })

  it('clears the post-delete target when the dialog refuses to open', () => {
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(false)

    openDeleteDialog()

    expect(selectionEffects.notePostDeleteFocusTarget).toHaveBeenCalledWith(
      null,
    )
  })
})
