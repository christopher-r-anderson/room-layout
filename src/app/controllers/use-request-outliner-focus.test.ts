/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRequestOutlinerFocus } from '@/app/controllers/use-request-outliner-focus'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'
import * as sceneStateStore from '@/editor-state/scene-state-store'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

vi.mock('@/editor-state/scene-state-store')
vi.mock('@/editor-state/selection-meta-store', () => ({
  selectionMetaActions: {
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
    vi.mocked(sceneStateStore.useSelectedFurniture).mockReturnValue(
      selectedFurniture as FurnitureItem,
    )
    vi.mocked(sceneStateStore.useItems).mockReturnValue([])

    const { result } = renderHook(() => useRequestOutlinerFocus())
    result.current()

    expect(selectionMetaActions.requestOutlinerFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetSelectedId: 'furniture-1',
      }),
    )
  })

  it('requests focus on first item when no selection but items exist', () => {
    vi.mocked(sceneStateStore.useSelectedFurniture).mockReturnValue(null)
    const items = [
      { id: 'item-1' },
      { id: 'item-2' },
    ] satisfies Partial<FurnitureItem>[]
    vi.mocked(sceneStateStore.useItems).mockReturnValue(
      items as FurnitureItem[],
    )

    const { result } = renderHook(() => useRequestOutlinerFocus())
    result.current()

    expect(selectionMetaActions.requestOutlinerFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredIndex: 0,
      }),
    )
  })

  it('requests focus on container when no selection and no items', () => {
    vi.mocked(sceneStateStore.useSelectedFurniture).mockReturnValue(null)
    vi.mocked(sceneStateStore.useItems).mockReturnValue([])

    const { result } = renderHook(() => useRequestOutlinerFocus())
    result.current()

    expect(selectionMetaActions.requestOutlinerFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        focusContainer: true,
      }),
    )
  })
})
