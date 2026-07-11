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
} from '@/core/stores/selection-store'
import {
  focusActions,
  getPendingFocus,
  resetFocusStore,
} from '@/core/stores/focus-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { sceneCommands } from '@/core/scene-commands'
import { deleteSelection } from '@/core/operations/furniture-mutations'
import { confirmDeleteSelection, openDeleteDialog } from './deletion-actions'
import { CHAIR } from '@/test/support/furniture'
import { stubLayout } from '@/test/support/stub-layout'

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
  resetFocusStore()
  resetEditorLifecycleStore()
  resetFeedbackStore()
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  vi.unstubAllGlobals()
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
    expect(getPendingFocus()).toBeNull()
  })

  it('returns focus to the scene when the dialog was opened from it', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id)

    openDeleteDialog('scene')
    confirmDeleteSelection(CHAIR)

    expect(getPendingFocus()).toEqual({ surface: 'scene' })
    expect(feedbackStoreForTests.getState().polite.text).toBe(
      `${CHAIR.name} removed from room.`,
    )
  })

  it('directs focus to the item collection at the deleted index when opened from the item actions on desktop', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id)

    openDeleteDialog('item-actions')
    confirmDeleteSelection(CHAIR)

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'index', index: 0 },
    })
  })

  // Pins the historic mobile leak through the full action path (origin
  // handoff across the dialog on the mobile layout); the policy cell itself
  // lives in focus-policy.test.
  it('repairs focus to the scene when opened from the item actions on mobile', () => {
    stubLayout('mobile')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id)

    // The item-actions surface unmounts with the deleted selection on mobile;
    // focus must land on the scene instead of falling to the body.
    openDeleteDialog('item-actions')
    confirmDeleteSelection(CHAIR)

    expect(getPendingFocus()).toEqual({ surface: 'scene' })
  })

  it('drops the recorded origin when the dialog refuses to open', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(deleteSelection).mockReturnValue(true)
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(false)
    vi.spyOn(dialogActions, 'closeActiveDialog')
    selectionActions.setSelection(CHAIR.id)
    // The recorded item-actions origin would send focus to the item
    // collection; with it dropped, the tracked scene claim decides.
    focusActions.surfaceFocused('scene')

    openDeleteDialog('item-actions')
    confirmDeleteSelection(CHAIR)

    expect(getPendingFocus()).toEqual({ surface: 'scene' })
  })
})
