import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  readSceneState,
  waitForFirstItemX,
} from './support/editor-harness'

test('keeps dragged furniture inside room bounds near the wall', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Armchair')
  const initialItem = addedState.items[0]

  await dragSelectedFurniture(page, {
    x: 1_600,
    y: 0,
  })

  await waitForFirstItemX(page, 2.425, 2)

  const draggedState = await readSceneState(page)
  const draggedItem = draggedState.items[0]

  expect(draggedState.itemCount).toBe(1)
  expect(draggedState.selectedName).toBe('Leather Armchair')
  expect(draggedItem.id).toBe(initialItem.id)
  expect(draggedItem.position).not.toEqual(initialItem.position)
  expect(draggedItem.position[0]).toBeLessThanOrEqual(2.425)
  expect(draggedItem.position[0]).toBeCloseTo(2.425, 2)
})
