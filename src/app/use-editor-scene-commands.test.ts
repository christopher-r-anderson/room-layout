// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './editor-command-messages'
import { useEditorSceneCommands } from './use-editor-scene-commands'
import type { SceneRef } from '@/scene/scene.types'

function createSceneRef(overrides?: Partial<SceneRef>) {
  return {
    current: {
      addFurniture: vi.fn(() => ({ ok: true as const, id: 'new-item' })),
      clearSelection: vi.fn(),
      deleteSelection: vi.fn(() => true),
      getSnapshot: vi.fn(),
      moveSelection: vi.fn(() => ({
        ok: false as const,
        reason: 'none-selected' as const,
      })),
      redo: vi.fn(() => true),
      rotateSelection: vi.fn(),
      selectById: vi.fn((id: string | null) => ({ ok: true as const, id })),
      setSelectionPosition: vi.fn(() => ({
        ok: false as const,
        reason: 'none-selected' as const,
      })),
      undo: vi.fn(() => true),
      ...overrides,
    } satisfies SceneRef,
  }
}

describe('useEditorSceneCommands', () => {
  it('maps add-furniture results through shared message constants', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const addFurniture = vi.fn<SceneRef['addFurniture']>()
    const sceneRef = createSceneRef({ addFurniture })

    const { result, rerender } = renderHook(
      ({ catalogIdToAdd }) =>
        useEditorSceneCommands({
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
      useEditorSceneCommands({
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
      result.current.confirmDeleteSelection()
    })
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      DELETE_SELECTION_MISSING_MESSAGE,
    )

    deleteSelection.mockReturnValueOnce(true)
    act(() => {
      result.current.confirmDeleteSelection()
    })
    expect(clearEditorMessage).toHaveBeenCalledTimes(1)
  })

  it('forwards selectById when interactions are enabled', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const selectById = vi.fn<SceneRef['selectById']>((id) => ({
      ok: true,
      id,
    }))
    const sceneRef = createSceneRef({ selectById })

    const { result } = renderHook(() =>
      useEditorSceneCommands({
        catalogIdToAdd: 'leather-couch',
        clearEditorMessage,
        editorInteractionsEnabled: true,
        rotationStepRadians: Math.PI / 12,
        sceneRef,
        setEditorMessage,
      }),
    )

    act(() => {
      result.current.selectById('item-1')
    })

    expect(selectById).toHaveBeenCalledWith('item-1')
  })

  it('does not invoke scene commands while interactions are disabled', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const sceneRef = createSceneRef()

    const { result } = renderHook(() =>
      useEditorSceneCommands({
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
      result.current.confirmDeleteSelection()
      result.current.rotateSelection(1)
      result.current.selectById('item-1')
      result.current.undo()
      result.current.redo()
    })

    expect(sceneRef.current.addFurniture).not.toHaveBeenCalled()
    expect(sceneRef.current.deleteSelection).not.toHaveBeenCalled()
    expect(sceneRef.current.rotateSelection).not.toHaveBeenCalled()
    expect(sceneRef.current.selectById).not.toHaveBeenCalled()
    expect(sceneRef.current.undo).not.toHaveBeenCalled()
    expect(sceneRef.current.redo).not.toHaveBeenCalled()
  })

  it('safely no-ops when sceneRef.current is unavailable', () => {
    const setEditorMessage = vi.fn()
    const clearEditorMessage = vi.fn()
    const sceneRef = { current: null as SceneRef | null }

    const { result } = renderHook(() =>
      useEditorSceneCommands({
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
      result.current.confirmDeleteSelection()
      result.current.rotateSelection(1)
      result.current.selectById('item-1')
      result.current.undo()
      result.current.redo()
    })

    expect(setEditorMessage).not.toHaveBeenCalled()
    expect(clearEditorMessage).not.toHaveBeenCalled()
  })
})
