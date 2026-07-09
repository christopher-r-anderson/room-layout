// @vitest-environment jsdom
import {
  appToastManager,
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { sceneCommands } from '@/core/scene-commands'
import { deleteSelection } from '@/core/operations/furniture-mutations'
import { confirmDeleteSelection, openDeleteDialog } from './deletion-actions'
import { CHAIR } from '@/test/support/furniture'

vi.mock('@/core/operations/furniture-mutations', () => ({
  addFurniture: vi.fn(),
  deleteSelection: vi.fn(),
  moveSelection: vi.fn(),
  rotateSelection: vi.fn(),
  setSelectionTransform: vi.fn(),
}))

beforeEach(() => {
  resetSceneDocumentStore()
  resetSelectionStore()
  resetEditorLifecycleStore()
  resetFeedbackStore()
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('deletion-actions', () => {
  it('raises the missing-selection error toast and skips delete when scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const closeActiveDialog = vi.spyOn(dialogActions, 'closeActiveDialog')
    const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')

    confirmDeleteSelection(CHAIR)

    expect(closeActiveDialog).toHaveBeenCalled()
    expect(deleteSelection).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'No selected furniture item was available to delete.',
        type: 'error',
      }),
    )
    expect(useSelectionStore.getState().roomViewFocusRequest).toBeNull()
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('requests room-view focus after delete when canvas was the source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id, 'canvas-keyboard')

    confirmDeleteSelection(CHAIR)

    expect(useSelectionStore.getState().roomViewFocusRequest).toEqual(
      expect.any(Number),
    )
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
    expect(feedbackStoreForTests.getState().polite.text).toBe(
      `${CHAIR.name} removed from room.`,
    )
  })

  it('requests outliner focus at the deleted index when not a canvas source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id, 'panel-keyboard')

    confirmDeleteSelection(CHAIR)

    expect(useSelectionStore.getState().roomViewFocusRequest).toBeNull()
    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 0 }),
    )
  })

  it('returns focus to the outliner when the dialog was opened from it', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    // Canvas source would otherwise send focus to the room view; the recorded
    // open target must win.
    selectionActions.setSelection(CHAIR.id, 'canvas-keyboard')

    openDeleteDialog('outliner')
    confirmDeleteSelection(CHAIR)

    expect(useSelectionStore.getState().roomViewFocusRequest).toBeNull()
    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 0 }),
    )
  })

  it('returns focus to the room view when the dialog was opened from it', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id, 'panel-keyboard')

    openDeleteDialog('room-view')
    confirmDeleteSelection(CHAIR)

    expect(useSelectionStore.getState().roomViewFocusRequest).toEqual(
      expect.any(Number),
    )
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('drops the recorded focus target when the dialog refuses to open', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(false)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id, 'canvas-keyboard')

    openDeleteDialog('outliner')
    confirmDeleteSelection(CHAIR)

    // With no recorded target, the canvas source decides: room view.
    expect(useSelectionStore.getState().roomViewFocusRequest).toEqual(
      expect.any(Number),
    )
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })
})
