import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  waitForFirstItemPosition,
} from './support/editor-harness'

test('drags selected furniture through the canvas and preserves history undo', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialItem = addedState.items[0]

  const draggedState = await dragSelectedFurniture(page, {
    x: 160,
    y: 40,
  })
  const draggedItem = draggedState.items[0]

  expect(draggedState.itemCount).toBe(1)
  expect(draggedState.selectedName).toBe('Leather Couch')
  expect(draggedItem.id).toBe(initialItem.id)
  expect(draggedItem.position).not.toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Undo' }).click()
  const afterUndo = await waitForFirstItemPosition(page, initialItem.position)
  expect(afterUndo).toMatchObject({
    itemCount: 1,
    selectedName: 'Leather Couch',
  })
  expect(afterUndo.items[0]?.position).toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedo = await waitForFirstItemPosition(page, draggedItem.position)
  expect(afterRedo).toMatchObject({
    itemCount: 1,
    selectedName: 'Leather Couch',
  })
  expect(afterRedo.items[0]?.position).toEqual(draggedItem.position)
})
