// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { previewFromScene, resetPreviewState } from './preview-actions'
import { startPreviewReconciler } from './preview-reconciler'

const CHAIR = {
  id: 'item-1',
  catalogId: 'test',
  name: 'Test Item',
  kind: 'armchair' as const,
  collectionId: 'test',
  nodeName: 'test',
  sourcePath: 'test',
  footprintSize: { width: 1, depth: 1 },
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
}

describe('startPreviewReconciler', () => {
  let stop: () => void

  beforeEach(() => {
    resetSceneDocumentStore()
    resetEditorLifecycleStore()
    resetPreviewState()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    editorLifecycleActions.markAssetsReady()
    stop = startPreviewReconciler()
  })

  afterEach(() => {
    stop()
    resetPreviewState()
    resetSceneDocumentStore()
    resetEditorLifecycleStore()
  })

  it('does not restore scene preview automatically after drag gate lifts', () => {
    previewFromScene('item-1')
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBe('item-1')

    sceneDocumentActions.setDragging(true)
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()

    sceneDocumentActions.setDragging(false)
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()
  })

  it('clears the preview when interactions become disabled', () => {
    previewFromScene('item-1')
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBe('item-1')

    editorLifecycleActions.beginAssetLoad()
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()
  })
})
