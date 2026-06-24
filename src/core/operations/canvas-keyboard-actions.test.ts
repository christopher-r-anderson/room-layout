// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import { sceneCommands } from '@/scene/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectById } from '@/core/operations/selection-actions'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { resetDialogStore } from '@/core/stores/dialog-store'
import { getPreviewedId } from '@/core/operations/previewed-id'
import {
  browseCanvasPreview,
  selectCanvasPreviewed,
} from './canvas-keyboard-actions'

vi.mock('@/core/stores/feedback-store', () => ({
  feedbackActions: { announcePolite: vi.fn() },
}))

vi.mock('@/core/operations/selection-actions', () => ({
  selectById: vi.fn(() => ({ ok: true, status: 'selected' }) as const),
}))

function item(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'chair',
    collectionId: 'collection-1',
    footprintSize: { width: 1, depth: 1 },
    kind: 'armchair',
    name: id,
    nodeName: 'ChairNode',
    position: [0, 0, 0],
    rotationY: 0,
    sourcePath: '/models/chair.glb',
  }
}

const SNAPSHOT = {
  items: [
    { id: 'left', name: 'Left Chair', pointerTarget: { x: 10, y: 10 } },
    { id: 'right', name: 'Right Chair', pointerTarget: { x: 90, y: 10 } },
    { id: 'hidden', name: 'Hidden Chair', pointerTarget: null },
  ],
}

describe('canvas-keyboard-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetEditorLifecycleStore()
    resetDialogStore()
    editorLifecycleActions.markAssetsReady()
    sceneDocumentActions.setHistory(
      createHistoryState([item('left'), item('right')]),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('browses spatially-ordered items, advancing through the live preview', () => {
    vi.spyOn(sceneCommands, 'getSnapshot').mockReturnValue(SNAPSHOT as never)

    browseCanvasPreview('next')
    expect(getPreviewedId()).toBe('left')
    expect(feedbackActions.announcePolite).toHaveBeenLastCalledWith(
      'Left Chair',
    )

    browseCanvasPreview('next')
    expect(getPreviewedId()).toBe('right')
    expect(feedbackActions.announcePolite).toHaveBeenLastCalledWith(
      'Right Chair',
    )
  })

  it('does nothing when no visible scene items are available', () => {
    vi.spyOn(sceneCommands, 'getSnapshot').mockReturnValue({
      items: [{ id: 'hidden', name: 'Hidden Chair', pointerTarget: null }],
    } as never)

    browseCanvasPreview('next')

    expect(getPreviewedId()).toBeNull()
    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
  })

  it('selects the current preview and clears it', () => {
    sceneDocumentActions.setPreviewedId('right')

    selectCanvasPreviewed()

    expect(selectById).toHaveBeenCalledWith('right', 'canvas-keyboard')
    expect(getPreviewedId()).toBeNull()
  })

  it('does nothing on select when there is no preview', () => {
    selectCanvasPreviewed()

    expect(selectById).not.toHaveBeenCalled()
  })
})
