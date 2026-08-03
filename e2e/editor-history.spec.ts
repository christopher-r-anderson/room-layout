import { expect, test } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  rotateSelectionRight,
  waitForFirstItemRotationY,
  waitForItemCount,
} from './support/editor-harness'

// Integration smoke: real operations commit to the shared history, and undo/redo
// route through both the toolbar button and Ctrl+Z. The stack ordering and each
// operation's history transition are unit-tested (editor-history, scene-history-
// state, furniture-operations); delete's undo is covered in editor-hotkeys.
test('undo and redo route through the toolbar and keyboard to the shared history', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  expect(addedState.itemCount).toBe(1)
  const initialRotationY = addedState.items[0].rotationY

  const rotatedState = await rotateSelectionRight(page)
  expect(rotatedState.items[0].rotationY).not.toBe(initialRotationY)
  const rotatedRotationY = rotatedState.items[0].rotationY

  await page.keyboard.press('Control+Z')
  await waitForFirstItemRotationY(page, initialRotationY, 6)

  await page.getByRole('button', { name: 'Undo' }).click()
  await waitForItemCount(page, 0)

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedoAdd = await waitForItemCount(page, 1)
  expect(afterRedoAdd.items[0].rotationY).toBe(initialRotationY)

  await page.getByRole('button', { name: 'Redo' }).click()
  await waitForFirstItemRotationY(page, rotatedRotationY, 6)
})
