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
  resetSelectionFocusStore,
  selectionFocusStore,
} from '@/core/stores/selection-focus-store'
import { sceneCommands } from '@/scene/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import {
  invalidSelectedItemDetailValueMessage,
  updateSelectedItemDetails,
} from './selected-item-detail-actions'
import { CHAIR } from '@/test/support/furniture'

vi.mock('@/core/stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
    setStatusMessage: vi.fn(),
    clearStatusMessage: vi.fn(),
  },
}))

describe('selected-item-detail-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSelectionFocusStore()
    resetEditorLifecycleStore()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    sceneDocumentActions.setSelectedId(CHAIR.id)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('invalidSelectedItemDetailValueMessage', () => {
    it('formats the invalid-value message for the supplied field', () => {
      expect(invalidSelectedItemDetailValueMessage('Left wall')).toBe(
        'Left wall must be a valid number.',
      )
    })
  })

  describe('updateSelectedItemDetails', () => {
    it('returns a no-selection result when the scene is not ready', () => {
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
      const setSelectionTransform = vi.spyOn(
        sceneCommands,
        'setSelectionTransform',
      )

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
      vi.spyOn(sceneCommands, 'setSelectionTransform').mockReturnValue({
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
      expect(selectionFocusStore.getState().selectedSource).toBe(
        'panel-keyboard',
      )
      expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
        'Chair details updated.',
      )
    })

    it('returns a bare no-op result without announcing when nothing changed', () => {
      editorLifecycleActions.markAssetsReady()
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
      vi.spyOn(sceneCommands, 'setSelectionTransform').mockReturnValue({
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
      expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
    })

    it('surfaces a blocked message when the transform is rejected', () => {
      editorLifecycleActions.markAssetsReady()
      vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
      vi.spyOn(sceneCommands, 'setSelectionTransform').mockReturnValue({
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
