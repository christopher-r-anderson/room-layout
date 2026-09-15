// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
} from '@/core/stores/scene-session-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { resetDialogStore } from '@/core/stores/dialog-store'
import {
  derivePreviewedId,
  getPreviewedId,
  usePreviewedId,
} from './previewed-id'

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

const ITEMS = [item('a')]

describe('derivePreviewedId', () => {
  it('returns the raw id when interactive, idle, unobstructed, and present', () => {
    expect(derivePreviewedId('a', false, false, true, ITEMS)).toBe('a')
  })

  it('returns null when nothing is previewed', () => {
    expect(derivePreviewedId(null, false, false, true, ITEMS)).toBeNull()
  })

  it('returns null while dragging, blocked by an overlay, or non-interactive', () => {
    expect(derivePreviewedId('a', true, false, true, ITEMS)).toBeNull()
    expect(derivePreviewedId('a', false, true, true, ITEMS)).toBeNull()
    expect(derivePreviewedId('a', false, false, false, ITEMS)).toBeNull()
  })

  it('returns null when the previewed id is no longer a live item', () => {
    expect(derivePreviewedId('gone', false, false, true, ITEMS)).toBeNull()
  })
})

describe('usePreviewedId / getPreviewedId', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSceneSessionStore()
    resetEditorLifecycleStore()
    resetDialogStore()
    editorLifecycleActions.markAssetsReady()
    sceneDocumentActions.setHistory(createHistoryState([item('a')]))
    sceneSessionActions.setPreviewedId('a')
  })

  it('reads the gated previewed id from the stores', () => {
    const { result } = renderHook(() => usePreviewedId())

    expect(result.current).toBe('a')
    expect(getPreviewedId()).toBe('a')
  })

  it('gates on dragging from the scene-session store', () => {
    sceneSessionActions.setDragging(true)

    expect(getPreviewedId()).toBeNull()

    const { result } = renderHook(() => usePreviewedId())
    expect(result.current).toBeNull()
  })
})
