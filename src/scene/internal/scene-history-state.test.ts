import { describe, expect, it } from 'vitest'
import {
  commitHistoryPresent,
  createHistoryState,
} from '@/lib/ui/editor-history'
import type { FurnitureItem } from '../objects/furniture.types'
import {
  getSceneHistoryAvailability,
  redoSceneHistory,
  undoSceneHistory,
} from './scene-history-state'

function createFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    catalogId: `${id}-catalog`,
    name: `Furniture ${id}`,
    kind: 'armchair',
    collectionId: 'test-collection',
    nodeName: id,
    sourcePath: '/models/test.glb',
    footprintSize: {
      width: 1,
      depth: 1,
    },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

describe('scene history state', () => {
  it('disables undo and redo while dragging even when history exists', () => {
    const item = createFurnitureItem('chair-1')
    const history = commitHistoryPresent(
      createHistoryState<FurnitureItem[]>([]),
      [item],
    )

    expect(
      getSceneHistoryAvailability({
        history,
        selectedId: item.id,
        isDragging: true,
      }),
    ).toEqual({
      canUndo: false,
      canRedo: false,
    })
  })

  it('preserves a newer selection when redo reapplies history', () => {
    const firstItem = createFurnitureItem('chair-1')
    const secondItem = createFurnitureItem('chair-2')
    const initialHistory = createHistoryState<FurnitureItem[]>([firstItem])
    const committedHistory = commitHistoryPresent(initialHistory, [
      firstItem,
      secondItem,
    ])
    const undone = undoSceneHistory({
      history: committedHistory,
      selectedId: firstItem.id,
      isDragging: false,
    })

    const redone = redoSceneHistory({
      history: undone.history,
      selectedId: secondItem.id,
      isDragging: false,
    })

    expect(redone.didChange).toBe(true)
    expect(redone.selectedId).toBe(secondItem.id)
    expect(redone.history.present).toEqual([firstItem, secondItem])
  })

  it('clears selection when undo restores a state without the selected item', () => {
    const firstItem = createFurnitureItem('chair-1')
    const secondItem = createFurnitureItem('chair-2')
    const history = commitHistoryPresent(
      createHistoryState<FurnitureItem[]>([firstItem]),
      [firstItem, secondItem],
    )

    const undone = undoSceneHistory({
      history,
      selectedId: secondItem.id,
      isDragging: false,
    })

    expect(undone.didChange).toBe(true)
    expect(undone.selectedId).toBeNull()
    expect(undone.history.present).toEqual([firstItem])
  })

  it('preserves selection on undo when the previously-selected item exists in the restored state', () => {
    const item1 = createFurnitureItem('item-1')
    const item2 = createFurnitureItem('item-2')
    const history = commitHistoryPresent(
      createHistoryState<FurnitureItem[]>([item1]),
      [item1, item2],
    )

    const undoResult = undoSceneHistory({
      history,
      selectedId: item1.id,
      isDragging: false,
    })

    expect(undoResult.didChange).toBe(true)
    expect(undoResult.selectedId).toBe(item1.id)
    expect(undoResult.history.present).toEqual([item1])
  })

  it('clears selection on redo when the redo state does not contain the selected item', () => {
    const item1 = createFurnitureItem('item-1')
    const item2 = createFurnitureItem('item-2')
    const committed = commitHistoryPresent(
      createHistoryState<FurnitureItem[]>([item1, item2]),
      [item2],
    )
    const undone = undoSceneHistory({
      history: committed,
      selectedId: item1.id,
      isDragging: false,
    })

    const redoResult = redoSceneHistory({
      history: undone.history,
      selectedId: item1.id,
      isDragging: false,
    })

    expect(redoResult.didChange).toBe(true)
    expect(redoResult.selectedId).toBeNull()
    expect(redoResult.history.present).toEqual([item2])
  })
})
