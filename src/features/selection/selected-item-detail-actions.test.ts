// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import { sceneCommands } from '@/core/scene-commands'
import {
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import { setSelectionTransform } from '@/core/operations/furniture-mutations'
import { updateSelectedItemDetails } from './selected-item-detail-actions'
import { CHAIR } from '@/test/support/furniture'

vi.mock('@/core/operations/furniture-mutations', () => ({
  addFurniture: vi.fn(),
  deleteSelection: vi.fn(),
  moveSelection: vi.fn(),
  rotateSelection: vi.fn(),
  setSelectionTransform: vi.fn(),
}))

const politeText = () => feedbackStoreForTests.getState().polite.text

describe('selected-item-detail-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSelectionStore()
    resetEditorLifecycleStore()
    resetFeedbackStore()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    selectionActions.setSelection(CHAIR.id, null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('updateSelectedItemDetails', () => {
    it('returns a no-selection result when the scene is not ready', () => {
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)

      expect(
        updateSelectedItemDetails({
          field: 'positionX',
          fieldLabel: 'Left wall',
          value: 1,
        }),
      ).toEqual({
        ok: false,
        reason: 'no-selection',
        message: 'Select a furniture item first.',
      })
      expect(setSelectionTransform).not.toHaveBeenCalled()
    })

    it('applies the transform, marks panel-keyboard source, and announces on success', () => {
      editorLifecycleActions.markAssetsReady()
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
      const updatedItem = { ...CHAIR, name: 'Chair' }
      vi.mocked(setSelectionTransform).mockReturnValue({
        ok: true,
        item: updatedItem,
      })

      expect(
        updateSelectedItemDetails({
          field: 'rotationDegrees',
          fieldLabel: 'Rotate',
          value: 90,
        }),
      ).toEqual({ ok: true, item: updatedItem })
      expect(useSelectionStore.getState().selectedSource).toBe('panel-keyboard')
      expect(politeText()).toBe('Chair details updated.')
    })

    it('returns a bare no-op result without announcing when nothing changed', () => {
      editorLifecycleActions.markAssetsReady()
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
      vi.mocked(setSelectionTransform).mockReturnValue({
        ok: false,
        reason: 'no-op',
      })

      expect(
        updateSelectedItemDetails({
          field: 'positionX',
          fieldLabel: 'Left wall',
          value: 1,
        }),
      ).toEqual({ ok: false, reason: 'no-op' })
      expect(politeText()).toBe('')
    })

    it('surfaces a blocked message when the transform is rejected', () => {
      editorLifecycleActions.markAssetsReady()
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
      vi.mocked(setSelectionTransform).mockReturnValue({
        ok: false,
        reason: 'blocked-bounds',
      })

      expect(
        updateSelectedItemDetails({
          field: 'positionZ',
          fieldLabel: 'Back wall',
          value: 99,
        }),
      ).toEqual({
        ok: false,
        reason: 'blocked-bounds',
        message: 'Back wall must stay inside the room.',
      })
    })
  })
})
