import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  selectFurnitureById,
  waitForEditorReady,
} from './support/editor-harness'

test('keeps dragged furniture inside room bounds near the wall', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const addedState = await addFurniture(page, 'Leather Armchair')
  const initialItem = addedState.items[0]

  if (addedState.selectedId !== initialItem.id) {
    await selectFurnitureById(page, initialItem.id)
  }

  const draggedState = await dragSelectedFurniture(page, {
    x: 1200,
    y: 0,
  })
  const draggedItem = draggedState.items[0]

  expect(draggedState.itemCount).toBe(1)
  expect(draggedState.selectedName).toBe('Leather Armchair')
  expect(draggedItem.id).toBe(initialItem.id)
  expect(draggedItem.position).not.toEqual(initialItem.position)
  expect(draggedItem.position[0]).toBeLessThanOrEqual(2.425)
  expect(draggedItem.position[0]).toBeCloseTo(2.425, 2)
})
