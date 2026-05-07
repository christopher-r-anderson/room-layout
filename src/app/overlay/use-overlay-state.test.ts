// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel } from '@/scene/scene.types'
import { useOverlayState } from './use-overlay-state'

const FURNITURE_ITEM: FurnitureItem = {
  id: 'item-1',
  catalogId: 'couch-1',
  name: 'Leather Couch',
  kind: 'couch',
  collectionId: 'leather-collection',
  nodeName: 'couch',
  sourcePath: '/models/leather-collection.glb',
  footprintSize: {
    width: 2.2,
    depth: 0.95,
  },
  position: [0, 0, 0],
  rotationY: 0,
}

const SCENE_READ_MODEL: SceneReadModel = {
  selectedId: 'item-1',
  items: [FURNITURE_ITEM],
}

describe('useOverlayState', () => {
  it('starts with the expected initial state', () => {
    const { result } = renderHook(() => useOverlayState())

    expect(result.current.sceneReadModel).toEqual({
      selectedId: null,
      items: [],
    })
    expect(result.current.selectedFurniture).toBeNull()
    expect(result.current.editorMessage).toBeNull()
    expect(result.current.historyAvailability).toEqual({
      canUndo: false,
      canRedo: false,
    })
    expect(result.current.catalogIdToAdd).toBe('')
  })

  it('handleHistoryChange updates availability', () => {
    const { result } = renderHook(() => useOverlayState())

    act(() => {
      result.current.handleHistoryChange({ canUndo: true, canRedo: false })
    })

    expect(result.current.historyAvailability).toEqual({
      canUndo: true,
      canRedo: false,
    })
  })

  it('handleSceneReadModelChange stores the latest scene list and selected id', () => {
    const { result } = renderHook(() => useOverlayState())

    act(() => {
      result.current.handleSceneReadModelChange(SCENE_READ_MODEL)
    })

    expect(result.current.sceneReadModel).toEqual(SCENE_READ_MODEL)
    expect(result.current.selectedFurniture).toEqual(FURNITURE_ITEM)
  })

  it('setEditorMessage and clearEditorMessage update editor message state', () => {
    const { result } = renderHook(() => useOverlayState())

    act(() => {
      result.current.setEditorMessage('Unable to place furniture')
    })
    expect(result.current.editorMessage).toBe('Unable to place furniture')

    act(() => {
      result.current.clearEditorMessage()
    })
    expect(result.current.editorMessage).toBeNull()
  })

  it('setCatalogIdToAdd updates active catalog id', () => {
    const { result } = renderHook(() => useOverlayState())

    act(() => {
      result.current.setCatalogIdToAdd('end-table-1')
    })

    expect(result.current.catalogIdToAdd).toBe('end-table-1')
  })

  describe('initializeCatalogSelection', () => {
    const CATALOG = [
      { id: 'chair-1', name: 'Chair' },
      { id: 'table-1', name: 'Table' },
    ] as Parameters<
      ReturnType<typeof useOverlayState>['initializeCatalogSelection']
    >[0]

    it('sets the first entry when catalogIdToAdd is empty', () => {
      const { result } = renderHook(() => useOverlayState())

      act(() => {
        result.current.initializeCatalogSelection(CATALOG)
      })

      expect(result.current.catalogIdToAdd).toBe('chair-1')
    })

    it('preserves the current id when it still exists in the new catalog', () => {
      const { result } = renderHook(() => useOverlayState())

      act(() => {
        result.current.setCatalogIdToAdd('table-1')
      })

      act(() => {
        result.current.initializeCatalogSelection(CATALOG)
      })

      expect(result.current.catalogIdToAdd).toBe('table-1')
    })

    it('falls back to the first entry when the current id is no longer in the catalog', () => {
      const { result } = renderHook(() => useOverlayState())

      act(() => {
        result.current.setCatalogIdToAdd('old-sofa-1')
      })

      act(() => {
        result.current.initializeCatalogSelection(CATALOG)
      })

      expect(result.current.catalogIdToAdd).toBe('chair-1')
    })

    it('sets empty string when called with an empty catalog', () => {
      const { result } = renderHook(() => useOverlayState())

      act(() => {
        result.current.initializeCatalogSelection([])
      })

      expect(result.current.catalogIdToAdd).toBe('')
    })
  })

  it('resetOverlayState clears selection, message, and history availability', () => {
    const { result } = renderHook(() => useOverlayState())

    act(() => {
      result.current.handleSceneReadModelChange(SCENE_READ_MODEL)
      result.current.setEditorMessage('temporary')
      result.current.handleHistoryChange({ canUndo: true, canRedo: true })
      result.current.setCatalogIdToAdd('end-table-1')
    })

    act(() => {
      result.current.resetOverlayState()
    })

    expect(result.current.sceneReadModel).toEqual({
      selectedId: null,
      items: [],
    })
    expect(result.current.selectedFurniture).toBeNull()
    expect(result.current.editorMessage).toBeNull()
    expect(result.current.historyAvailability).toEqual({
      canUndo: false,
      canRedo: false,
    })
    expect(result.current.catalogIdToAdd).toBe('end-table-1')
  })
})
