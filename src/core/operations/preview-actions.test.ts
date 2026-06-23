// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
  sceneStateStore,
} from '@/core/stores/scene-state-store'
import {
  clearPreviewOnCanvasMiss,
  previewFromCanvasKeyboard,
  previewFromOutliner,
  previewFromScene,
  resetPreviewState,
} from './preview-actions'

const makeItem = (id: string) => ({
  id,
  catalogId: 'test',
  name: `Test Item ${id}`,
  kind: 'armchair' as const,
  collectionId: 'test',
  nodeName: 'test',
  sourcePath: 'test',
  footprintSize: { width: 1, depth: 1 },
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
})

const previewedIdRaw = () => sceneStateStore.getState().previewedIdRaw

beforeEach(() => {
  resetSceneStateStore()
  resetPreviewState()
  sceneStateActions.setHistory(
    createHistoryState([makeItem('item-1'), makeItem('item-2')]),
  )
})

afterEach(() => {
  vi.useRealTimers()
  resetPreviewState()
  resetSceneStateStore()
})

describe('preview-actions', () => {
  it('keeps outliner preview active when scene emits delayed clear', () => {
    vi.useFakeTimers()

    previewFromOutliner('item-1', 'outliner-hover')
    expect(previewedIdRaw()).toBe('item-1')

    previewFromScene(null)
    vi.advanceTimersByTime(60)

    expect(previewedIdRaw()).toBe('item-1')
  })

  it('clears scene preview after delayed leave window', () => {
    vi.useFakeTimers()

    previewFromScene('item-1')
    expect(previewedIdRaw()).toBe('item-1')

    previewFromScene(null)
    vi.advanceTimersByTime(60)

    expect(previewedIdRaw()).toBeNull()
  })

  it('keeps focus preview active when hover preview ends, then clears on blur', () => {
    previewFromOutliner('item-1', 'outliner-hover')
    expect(previewedIdRaw()).toBe('item-1')

    previewFromOutliner('item-2', 'outliner-focus')
    expect(previewedIdRaw()).toBe('item-2')

    previewFromOutliner(null, 'outliner-hover')
    expect(previewedIdRaw()).toBe('item-2')

    previewFromOutliner(null, 'outliner-focus')
    expect(previewedIdRaw()).toBeNull()
  })

  it('uses canvas-keyboard preview as an explicit preview source and clears it', () => {
    previewFromCanvasKeyboard('item-2')
    expect(previewedIdRaw()).toBe('item-2')

    previewFromCanvasKeyboard(null)
    expect(previewedIdRaw()).toBeNull()
  })

  it('does not clear a newer outliner preview when canvas-keyboard preview exits', () => {
    previewFromCanvasKeyboard('item-1')
    expect(previewedIdRaw()).toBe('item-1')

    previewFromOutliner('item-2', 'outliner-focus')
    expect(previewedIdRaw()).toBe('item-2')

    previewFromCanvasKeyboard(null)
    expect(previewedIdRaw()).toBe('item-2')
  })

  it('clears preview immediately on canvas miss', () => {
    previewFromScene('item-1')
    expect(previewedIdRaw()).toBe('item-1')

    clearPreviewOnCanvasMiss()
    expect(previewedIdRaw()).toBeNull()
  })
})
