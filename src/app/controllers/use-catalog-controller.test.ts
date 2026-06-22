// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import { selectionEffects } from '@/editor-state/selection-effects'
import { useCatalogController } from './use-catalog-controller'

vi.mock('@/editor-state/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
}))

describe('useCatalogController', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('clears stale add state without invoking the scene while disabled', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const addFurniture = vi
      .spyOn(sceneCommands, 'addFurniture')
      .mockReturnValue({ ok: true, id: 'item-1' })
    const clearEditorMessage = vi
      .spyOn(sceneStateActions, 'clearEditorMessage')
      .mockImplementation(() => undefined)

    const { result } = renderHook(() =>
      useCatalogController({
        setCatalogOpen: vi.fn(() => true),
        catalogIdToAdd: 'chair',
        editorInteractionsEnabled: false,
      }),
    )

    expect(result.current.handleAddFurniture()).toBe(false)
    expect(clearEditorMessage).toHaveBeenCalledTimes(1)
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(null)
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(addFurniture).not.toHaveBeenCalled()
  })

  it('maps add-furniture failures through shared messages', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const addFurniture = vi.spyOn(sceneCommands, 'addFurniture')
    const setEditorMessage = vi
      .spyOn(sceneStateActions, 'setEditorMessage')
      .mockImplementation(() => undefined)

    const { result, rerender } = renderHook(
      ({ catalogIdToAdd }) =>
        useCatalogController({
          setCatalogOpen: vi.fn(() => true),
          catalogIdToAdd,
          editorInteractionsEnabled: true,
        }),
      { initialProps: { catalogIdToAdd: 'chair' } },
    )

    addFurniture.mockReturnValueOnce({ ok: false, reason: 'no-space' })
    expect(result.current.handleAddFurniture()).toBe(false)
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      ADD_FURNITURE_NO_SPACE_MESSAGE,
    )

    rerender({ catalogIdToAdd: 'missing-item' })
    addFurniture.mockReturnValueOnce({
      ok: false,
      reason: 'unknown-catalog',
    })

    expect(result.current.handleAddFurniture()).toBe(false)
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
    )
  })

  it('marks toolbar selection effects after a successful add', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'addFurniture').mockReturnValue({
      ok: true,
      id: 'item-1',
    })

    const { result } = renderHook(() =>
      useCatalogController({
        setCatalogOpen: vi.fn(() => true),
        catalogIdToAdd: 'chair',
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      expect(result.current.handleAddFurniture()).toBe(true)
    })

    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith('toolbar')
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'added',
      requestOutlinerFocus: false,
    })
  })
})
