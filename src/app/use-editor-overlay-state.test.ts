// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel } from '@/scene/scene.types'
import { useEditorOverlayState } from './use-editor-overlay-state'

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

describe('useEditorOverlayState', () => {
  it('starts with the expected initial state', () => {
    const { result } = renderHook(() => useEditorOverlayState())

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
    expect(result.current.catalogIdToAdd).toBe(FURNITURE_CATALOG[0]?.id ?? '')
  })

  it('handleSelectionChange sets and clears selected furniture', () => {
    const { result } = renderHook(() => useEditorOverlayState())

    act(() => {
      result.current.handleSelectionChange(FURNITURE_ITEM)
    })
    expect(result.current.selectedFurniture).toEqual(FURNITURE_ITEM)

    act(() => {
      result.current.handleSelectionChange(null)
    })
    expect(result.current.selectedFurniture).toBeNull()
  })

  it('handleHistoryChange updates availability', () => {
    const { result } = renderHook(() => useEditorOverlayState())

    act(() => {
      result.current.handleHistoryChange({ canUndo: true, canRedo: false })
    })

    expect(result.current.historyAvailability).toEqual({
      canUndo: true,
      canRedo: false,
    })
  })

  it('handleSceneReadModelChange stores the latest scene list and selected id', () => {
    const { result } = renderHook(() => useEditorOverlayState())

    act(() => {
      result.current.handleSceneReadModelChange(SCENE_READ_MODEL)
    })

    expect(result.current.sceneReadModel).toEqual(SCENE_READ_MODEL)
  })

  it('setEditorMessage and clearEditorMessage update editor message state', () => {
    const { result } = renderHook(() => useEditorOverlayState())

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
    const { result } = renderHook(() => useEditorOverlayState())

    act(() => {
      result.current.setCatalogIdToAdd('end-table-1')
    })

    expect(result.current.catalogIdToAdd).toBe('end-table-1')
  })

  it('resetOverlayState clears selection, message, and history availability', () => {
    const { result } = renderHook(() => useEditorOverlayState())

    act(() => {
      result.current.handleSelectionChange(FURNITURE_ITEM)
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
