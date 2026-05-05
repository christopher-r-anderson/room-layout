// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './command-messages'
import { useSceneCommands } from './use-scene-commands'
import type { SceneRef } from '@/scene/scene.types'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

function createFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name: `Chair ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

function createSceneRef(overrides?: Partial<SceneRef>) {
  return {
    current: {
      addFurniture: vi.fn(() => ({ ok: true as const, id: 'new-item' })),
      clearSelection: vi.fn(),
      deleteSelection: vi.fn(() => true),
      getReadModel: vi.fn(() => ({ selectedId: null, items: [] })),
      getSnapshot: vi.fn(),
      moveSelection: vi.fn(() => ({
        ok: true as const,
        position: [0.5, 0, 0] as [number, number, number],
      })),
      redo: vi.fn(() => true),
      rotateSelection: vi.fn(),
      selectById: vi.fn(() => ({
        ok: true as const,
        status: 'selected' as const,
      })),
      undo: vi.fn(() => true),
      ...overrides,
    } satisfies SceneRef,
  }
}

describe('useSceneCommands', () => {
  it('maps add-furniture results through shared message constants', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const addFurniture = vi.fn<SceneRef['addFurniture']>()
    const sceneRef = createSceneRef({ addFurniture })

    const { result, rerender } = renderHook(
      ({ catalogIdToAdd }) =>
        useSceneCommands({
          catalogIdToAdd,
          clearEditorMessage,
          editorInteractionsEnabled: true,
          rotationStepRadians: Math.PI / 12,
          sceneRef,
          setEditorMessage,
        }),
      { initialProps: { catalogIdToAdd: 'leather-couch' } },
    )

    addFurniture.mockReturnValueOnce({ ok: true, id: 'item-1' })
    act(() => {
      expect(result.current.addFurniture()).toBe(true)
    })
    expect(clearEditorMessage).toHaveBeenCalledTimes(1)

    rerender({ catalogIdToAdd: 'leather-couch' })
    addFurniture.mockReturnValueOnce({ ok: false, reason: 'no-space' })
    act(() => {
      expect(result.current.addFurniture()).toBe(false)
    })
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      ADD_FURNITURE_NO_SPACE_MESSAGE,
    )

    rerender({ catalogIdToAdd: 'missing-item' })
    addFurniture.mockReturnValueOnce({ ok: false, reason: 'unknown-catalog' })
    act(() => {
      expect(result.current.addFurniture()).toBe(false)
    })
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
    )
  })

  it('maps delete results through the shared message constants', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const deleteSelection = vi.fn<SceneRef['deleteSelection']>()
    const sceneRef = createSceneRef({ deleteSelection })

    const { result } = renderHook(() =>
      useSceneCommands({
        catalogIdToAdd: 'leather-couch',
        clearEditorMessage,
        editorInteractionsEnabled: true,
        rotationStepRadians: Math.PI / 12,
        sceneRef,
        setEditorMessage,
      }),
    )

    deleteSelection.mockReturnValueOnce(false)
    act(() => {
      expect(result.current.confirmDeleteSelection()).toBe(false)
    })
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      DELETE_SELECTION_MISSING_MESSAGE,
    )

    deleteSelection.mockReturnValueOnce(true)
    act(() => {
      expect(result.current.confirmDeleteSelection()).toBe(true)
    })
    expect(clearEditorMessage).toHaveBeenCalledTimes(1)
  })

  it('does not invoke scene commands while interactions are disabled', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const sceneRef = createSceneRef()

    const { result } = renderHook(() =>
      useSceneCommands({
        catalogIdToAdd: 'leather-couch',
        clearEditorMessage,
        editorInteractionsEnabled: false,
        rotationStepRadians: Math.PI / 12,
        sceneRef,
        setEditorMessage,
      }),
    )

    act(() => {
      expect(result.current.addFurniture()).toBe(false)
      expect(
        result.current.moveSelection({ x: 0.5, z: 0 }, { source: 'inspector' }),
      ).toEqual({
        ok: false,
        reason: 'no-selection',
      })
      expect(result.current.selectById('item-1')).toEqual({
        ok: false,
        status: 'not-found',
      })
      result.current.clearSelection()
      result.current.confirmDeleteSelection()
      result.current.rotateSelection(1)
      result.current.undo()
      result.current.redo()
    })

    expect(sceneRef.current.addFurniture).not.toHaveBeenCalled()
    expect(sceneRef.current.deleteSelection).not.toHaveBeenCalled()
    expect(sceneRef.current.moveSelection).not.toHaveBeenCalled()
    expect(sceneRef.current.selectById).not.toHaveBeenCalled()
    expect(sceneRef.current.clearSelection).not.toHaveBeenCalled()
    expect(sceneRef.current.rotateSelection).not.toHaveBeenCalled()
    expect(sceneRef.current.undo).not.toHaveBeenCalled()
    expect(sceneRef.current.redo).not.toHaveBeenCalled()
  })

  it('safely no-ops when sceneRef.current is unavailable', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const sceneRef = { current: null as SceneRef | null }

    const { result } = renderHook(() =>
      useSceneCommands({
        catalogIdToAdd: 'leather-couch',
        clearEditorMessage,
        editorInteractionsEnabled: true,
        rotationStepRadians: Math.PI / 12,
        sceneRef,
        setEditorMessage,
      }),
    )

    act(() => {
      expect(result.current.addFurniture()).toBe(false)
      expect(
        result.current.moveSelection({ x: 0.5, z: 0 }, { source: 'inspector' }),
      ).toEqual({
        ok: false,
        reason: 'no-selection',
      })
      expect(result.current.selectById('item-1')).toEqual({
        ok: false,
        status: 'not-found',
      })
      expect(result.current.getSceneReadModel()).toBeNull()
      result.current.clearSelection()
      result.current.confirmDeleteSelection()
      result.current.rotateSelection(1)
      result.current.undo()
      result.current.redo()
    })

    expect(setEditorMessage).not.toHaveBeenCalled()
    expect(clearEditorMessage).not.toHaveBeenCalled()
  })

  it('forwards move/select/read model commands when scene is available', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const moveSelection = vi.fn<SceneRef['moveSelection']>(() => ({
      ok: true,
      position: [1, 0, 0] as [number, number, number],
    }))
    const selectById = vi.fn<SceneRef['selectById']>(() => ({
      ok: true,
      status: 'selected',
    }))
    const getReadModel = vi.fn<SceneRef['getReadModel']>(() => ({
      selectedId: 'item-1',
      items: [createFurnitureItem('item-1')],
    }))
    const sceneRef = createSceneRef({ moveSelection, selectById, getReadModel })

    const { result } = renderHook(() =>
      useSceneCommands({
        catalogIdToAdd: 'leather-couch',
        clearEditorMessage,
        editorInteractionsEnabled: true,
        rotationStepRadians: Math.PI / 12,
        sceneRef,
        setEditorMessage,
      }),
    )

    act(() => {
      expect(
        result.current.moveSelection({ x: 0.5, z: 0 }, { source: 'inspector' }),
      ).toEqual({
        ok: true,
        position: [1, 0, 0],
      })
      expect(result.current.selectById('item-1')).toEqual({
        ok: true,
        status: 'selected',
      })
      expect(result.current.getSceneReadModel()).toEqual({
        selectedId: 'item-1',
        items: [createFurnitureItem('item-1')],
      })
      result.current.clearSelection()
    })

    expect(moveSelection).toHaveBeenCalledWith(
      { x: 0.5, z: 0 },
      { source: 'inspector' },
    )
    expect(selectById).toHaveBeenCalledWith('item-1')
    expect(getReadModel).toHaveBeenCalledTimes(1)
    expect(sceneRef.current.clearSelection).toHaveBeenCalledTimes(1)
  })
})
