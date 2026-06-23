// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
  sceneStateStore,
} from '@/core/stores/scene-state-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { previewFromScene, resetPreviewState } from './preview-actions'
import { usePreviewReconciler } from './use-preview-reconciler'

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

beforeEach(() => {
  resetSceneStateStore()
  resetEditorLifecycleStore()
  resetPreviewState()
  sceneStateActions.setHistory(createHistoryState([CHAIR]))
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  resetPreviewState()
  resetSceneStateStore()
  resetEditorLifecycleStore()
})

describe('usePreviewReconciler', () => {
  it('does not restore scene preview automatically after drag gate lifts', () => {
    renderHook(() => {
      usePreviewReconciler()
    })

    act(() => {
      previewFromScene('item-1')
    })
    expect(sceneStateStore.getState().previewedIdRaw).toBe('item-1')

    act(() => {
      sceneStateActions.setDragging(true)
    })
    expect(sceneStateStore.getState().previewedIdRaw).toBeNull()

    act(() => {
      sceneStateActions.setDragging(false)
    })
    expect(sceneStateStore.getState().previewedIdRaw).toBeNull()
  })
})
