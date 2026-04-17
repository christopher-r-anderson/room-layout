import { expect, test } from '@playwright/test'
import {
  addFurniture,
  readSceneState,
  waitForEditorReady,
} from './support/editor-harness'

const ROTATION_STEP_RADIANS = Math.PI / 12

test('applies keyboard shortcuts for rotate, history, and delete confirmation', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialItem = addedState.items[0]

  await page.locator('body').press('e')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBeCloseTo(ROTATION_STEP_RADIANS, 6)

  const afterRotate = await readSceneState(page)
  expect(afterRotate.selectedName).toBe('Leather Couch')

  await page.locator('body').press('Control+z')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBe(initialItem.rotationY)

  const afterUndo = await readSceneState(page)
  expect(afterUndo.itemCount).toBe(1)
  expect(afterUndo.selectedName).toBe('Leather Couch')

  await page.locator('body').press('Control+y')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBeCloseTo(ROTATION_STEP_RADIANS, 6)

  await page.locator('body').press('Delete')
  const deleteDialog = page.getByRole('dialog', { name: /remove furniture\?/i })
  await expect(deleteDialog).toBeVisible()

  await page.locator('body').press('Control+z')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBeCloseTo(ROTATION_STEP_RADIANS, 6)
  await expect(deleteDialog).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Remove' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(0)

  await page.locator('body').press('Control+z')
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)

  const afterRestore = await readSceneState(page)
  expect(afterRestore.selectedName).toBe('Leather Couch')
  expect(afterRestore.items[0].rotationY).toBeCloseTo(ROTATION_STEP_RADIANS, 6)
})
