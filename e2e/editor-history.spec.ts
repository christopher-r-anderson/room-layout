import { expect, test } from '@playwright/test'
import {
  addFurniture,
  readSceneState,
  removeSelectedFurniture,
  rotateSelectionRight,
  waitForEditorReady,
} from './support/editor-harness'

test.setTimeout(60_000)

test('undo and redo restore editor history across add, rotate, and remove', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  expect(addedState.itemCount).toBe(1)
  expect(addedState.selectedName).toBe('Leather Couch')

  const initialItem = addedState.items[0]
  const rotatedState = await rotateSelectionRight(page)
  const rotatedItem = rotatedState.items[0]
  expect(rotatedState.itemCount).toBe(1)
  expect(rotatedItem.id).toBe(initialItem.id)
  expect(rotatedItem.rotationY).not.toBe(initialItem.rotationY)

  const removedState = await removeSelectedFurniture(page)
  expect(removedState.itemCount).toBe(0)
  expect(removedState.selectedName).toBeNull()

  await page.keyboard.press('Control+Z')
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)
  const afterUndoRemove = await readSceneState(page)
  expect(afterUndoRemove.itemCount).toBe(1)
  expect(afterUndoRemove.items[0].rotationY).toBeCloseTo(rotatedItem.rotationY)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBeCloseTo(initialItem.rotationY)
  const afterUndoRotate = await readSceneState(page)
  expect(afterUndoRotate.itemCount).toBe(1)
  expect(afterUndoRotate.items[0].rotationY).toBeCloseTo(initialItem.rotationY)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(0)
  const afterUndoAdd = await readSceneState(page)
  expect(afterUndoAdd.itemCount).toBe(0)
  expect(afterUndoAdd.selectedName).toBeNull()

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)
  const afterRedoAdd = await readSceneState(page)
  expect(afterRedoAdd.itemCount).toBe(1)
  expect(afterRedoAdd.items[0].rotationY).toBe(initialItem.rotationY)

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBeCloseTo(rotatedItem.rotationY)
  const afterRedoRotate = await readSceneState(page)
  expect(afterRedoRotate.itemCount).toBe(1)
  expect(afterRedoRotate.items[0].rotationY).toBeCloseTo(rotatedItem.rotationY)

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(0)
  const afterRedoRemove = await readSceneState(page)
  expect(afterRedoRemove.itemCount).toBe(0)
  expect(afterRedoRemove.selectedName).toBeNull()
})
