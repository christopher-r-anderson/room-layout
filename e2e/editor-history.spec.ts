import { expect, test } from '@playwright/test'
import {
  addFurniture,
  deleteSelectedFurniture,
  openEditor,
  rotateSelectionRight,
  waitForFirstItemRotationY,
  waitForItemCount,
} from './support/editor-harness'

test('undo and redo restore editor history across add, rotate, and delete', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  expect(addedState.itemCount).toBe(1)
  expect(addedState.selectedName).toBe('Leather Couch')

  const initialItem = addedState.items[0]
  const rotatedState = await rotateSelectionRight(page)
  const rotatedItem = rotatedState.items[0]
  expect(rotatedState.itemCount).toBe(1)
  expect(rotatedItem.id).toBe(initialItem.id)
  expect(rotatedItem.rotationY).not.toBe(initialItem.rotationY)

  const deletedState = await deleteSelectedFurniture(page)
  expect(deletedState.itemCount).toBe(0)
  expect(deletedState.selectedName).toBeNull()

  await page.keyboard.press('Control+Z')
  const afterUndoDelete = await waitForItemCount(page, 1)
  expect(afterUndoDelete.itemCount).toBe(1)
  expect(afterUndoDelete.items[0].rotationY).toBeCloseTo(rotatedItem.rotationY)

  await page.getByRole('button', { name: 'Undo' }).click()
  const afterUndoRotate = await waitForFirstItemRotationY(
    page,
    initialItem.rotationY,
    6,
  )
  expect(afterUndoRotate.itemCount).toBe(1)
  expect(afterUndoRotate.items[0].rotationY).toBeCloseTo(initialItem.rotationY)

  await page.getByRole('button', { name: 'Undo' }).click()
  const afterUndoAdd = await waitForItemCount(page, 0)
  expect(afterUndoAdd.itemCount).toBe(0)
  expect(afterUndoAdd.selectedName).toBeNull()

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedoAdd = await waitForItemCount(page, 1)
  expect(afterRedoAdd.itemCount).toBe(1)
  expect(afterRedoAdd.items[0].rotationY).toBe(initialItem.rotationY)

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedoRotate = await waitForFirstItemRotationY(
    page,
    rotatedItem.rotationY,
    6,
  )
  expect(afterRedoRotate.itemCount).toBe(1)
  expect(afterRedoRotate.items[0].rotationY).toBeCloseTo(rotatedItem.rotationY)

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedoDelete = await waitForItemCount(page, 0)
  expect(afterRedoDelete.itemCount).toBe(0)
  expect(afterRedoDelete.selectedName).toBeNull()
})
