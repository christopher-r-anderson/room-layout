/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRequestOutlinerFocus } from '@/app/controllers/use-request-outliner-focus'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import * as sceneDocumentStore from '@/core/stores/scene-document-store'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

vi.mock('@/core/stores/scene-document-store')
vi.mock('@/core/stores/selection-focus-store', () => ({
  selectionFocusActions: {
    requestOutlinerFocus: vi.fn(),
  },
}))

describe('useRequestOutlinerFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests focus on selected furniture when item is selected', () => {
    const selectedFurniture = {
      id: 'furniture-1',
    } satisfies Partial<FurnitureItem>
    vi.mocked(sceneDocumentStore.useSelectedFurniture).mockReturnValue(
      selectedFurniture as FurnitureItem,
    )
    vi.mocked(sceneDocumentStore.useItems).mockReturnValue([])

    const { result } = renderHook(() => useRequestOutlinerFocus())
    result.current()

    expect(selectionFocusActions.requestOutlinerFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetSelectedId: 'furniture-1',
      }),
    )
  })

  it('requests focus on first item when no selection but items exist', () => {
    vi.mocked(sceneDocumentStore.useSelectedFurniture).mockReturnValue(null)
    const items = [
      { id: 'item-1' },
      { id: 'item-2' },
    ] satisfies Partial<FurnitureItem>[]
    vi.mocked(sceneDocumentStore.useItems).mockReturnValue(
      items as FurnitureItem[],
    )

    const { result } = renderHook(() => useRequestOutlinerFocus())
    result.current()

    expect(selectionFocusActions.requestOutlinerFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredIndex: 0,
      }),
    )
  })

  it('requests focus on container when no selection and no items', () => {
    vi.mocked(sceneDocumentStore.useSelectedFurniture).mockReturnValue(null)
    vi.mocked(sceneDocumentStore.useItems).mockReturnValue([])

    const { result } = renderHook(() => useRequestOutlinerFocus())
    result.current()

    expect(selectionFocusActions.requestOutlinerFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        focusContainer: true,
      }),
    )
  })
})
