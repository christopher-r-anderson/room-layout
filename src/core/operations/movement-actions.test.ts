// @vitest-environment jsdom
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
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { sceneCommands } from '@/core/scene-commands'
import {
  announcementStoreForTests,
  resetAnnouncements,
} from '@/core/feedback/announcement-store'
import { toolbarInteractionActions } from '@/core/stores/toolbar-interaction-store'
import { CHAIR } from '@/test/support/furniture'
import {
  moveSelection as moveDocumentSelection,
  rotateSelection as rotateDocumentSelection,
} from './furniture-mutations'
import { moveSelection, rotateSelection } from './movement-actions'

vi.mock('./furniture-mutations', () => ({
  addFurniture: vi.fn(),
  deleteSelection: vi.fn(),
  moveSelection: vi.fn(),
  rotateSelection: vi.fn(() => true),
  setSelectionTransform: vi.fn(),
}))

const politeText = () => announcementStoreForTests.getState().polite.text

describe('movement-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSelectionStore()
    resetEditorLifecycleStore()
    resetAnnouncements()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    selectionActions.setSelection(CHAIR.id, null)
    editorLifecycleActions.markAssetsReady()
  })

  afterEach(() => {
    resetAnnouncements()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('does not invoke document movement mutations while the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: true,
      position: [1, 0, 0],
    })

    expect(moveSelection({ x: 1, z: 0 })).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    rotateSelection(1)

    expect(moveDocumentSelection).not.toHaveBeenCalled()
    expect(rotateDocumentSelection).not.toHaveBeenCalled()
  })

  it('forwards enabled move and rotate commands to the document mutations', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: true,
      position: [1, 0, 0],
    })

    expect(moveSelection({ x: 1, z: 0 })).toEqual({
      ok: true,
      position: [1, 0, 0],
    })
    rotateSelection(1)

    expect(moveDocumentSelection).toHaveBeenCalledWith({ x: 1, z: 0 })
    expect(rotateDocumentSelection).toHaveBeenCalledWith(Math.PI / 12)
  })

  it('announces the moved item and its new position after the movement debounce', () => {
    vi.useFakeTimers()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: true,
      position: [1.2, 0, -3.4],
    })

    moveSelection({ x: 1, z: 0 })

    // Movement feedback is debounced; nothing announces until it settles.
    expect(politeText()).toBe('')
    vi.runAllTimers()
    expect(politeText()).toBe('Chair moved to X 1.2 meters and Z -3.4 meters.')
  })

  it('announces the reason when a move is blocked', () => {
    vi.useFakeTimers()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: false,
      reason: 'blocked-bounds',
    })

    moveSelection({ x: 1, z: 0 })
    vi.runAllTimers()

    expect(politeText()).toBe('Movement blocked by room bounds.')
  })

  it('stays silent on a no-op move', () => {
    vi.useFakeTimers()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: false,
      reason: 'no-op',
    })

    moveSelection({ x: 1, z: 0 })
    vi.runAllTimers()

    expect(politeText()).toBe('')
  })

  it('announces the blocked reason and skips the pin grace when rotating mid-drag', () => {
    vi.useFakeTimers()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(rotateDocumentSelection).mockReturnValueOnce(false)
    const reportRotationSpy = vi.spyOn(
      toolbarInteractionActions,
      'reportRotation',
    )

    rotateSelection(1)
    vi.runAllTimers()

    // Only the debounced blocked message announces - never the success text.
    expect(politeText()).toBe('Finish dragging before using movement controls.')
    expect(reportRotationSpy).not.toHaveBeenCalled()
  })

  it('announces a successful rotation immediately', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)

    rotateSelection(1)

    expect(politeText()).toBe('Chair rotated.')
  })

  it('arms the toolbar pin grace on a real rotation', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const reportRotationSpy = vi.spyOn(
      toolbarInteractionActions,
      'reportRotation',
    )

    rotateSelection(1)

    expect(reportRotationSpy).toHaveBeenCalledTimes(1)
  })

  it('does not arm the toolbar pin grace when nothing is selected', () => {
    selectionActions.setSelection(null, null)
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const reportRotationSpy = vi.spyOn(
      toolbarInteractionActions,
      'reportRotation',
    )

    rotateSelection(1)

    expect(reportRotationSpy).not.toHaveBeenCalled()
  })
})
