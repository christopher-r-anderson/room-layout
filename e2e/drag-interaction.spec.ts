import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  readSceneState,
  waitForEditorReady,
} from './support/editor-harness'

test('drags selected furniture through the canvas and preserves history undo', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

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
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position)
    .toEqual(initialItem.position)

  const afterUndo = await readSceneState(page)
  expect(afterUndo.itemCount).toBe(1)
  expect(afterUndo.selectedName).toBe('Leather Couch')
  expect(afterUndo.items[0].position).toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position)
    .toEqual(draggedItem.position)

  const afterRedo = await readSceneState(page)
  expect(afterRedo.itemCount).toBe(1)
  expect(afterRedo.selectedName).toBe('Leather Couch')
  expect(afterRedo.items[0].position).toEqual(draggedItem.position)
})
