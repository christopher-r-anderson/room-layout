import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addFurniture,
  readSceneState,
  waitForEditorReady,
} from './support/editor-harness'

const ROTATION_STEP_RADIANS = Math.PI / 12
const NORMALIZED_RIGHT_ROTATION_RADIANS = Math.PI * 2 - ROTATION_STEP_RADIANS

async function tabTo(page: Page, target: Locator, maxTabs = 8) {
  for (let index = 0; index < maxTabs; index += 1) {
    try {
      await expect(target).toBeFocused({ timeout: 50 })
      return
    } catch {
      // Keep tabbing until the requested control receives focus.
    }

    await page.keyboard.press('Tab')
  }

  await expect(target).toBeFocused()
}

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
    .toBeCloseTo(NORMALIZED_RIGHT_ROTATION_RADIANS, 6)

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
    .toBeCloseTo(NORMALIZED_RIGHT_ROTATION_RADIANS, 6)

  await page.locator('body').press('Delete')
  const deleteDialog = page.getByRole('dialog', { name: /remove furniture\?/i })
  await expect(deleteDialog).toBeVisible()

  await page.locator('body').press('Control+z')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .toBeCloseTo(NORMALIZED_RIGHT_ROTATION_RADIANS, 6)
  await expect(deleteDialog).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Remove' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(0)

  await page.locator('body').press('Control+z')
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)

  const afterRestore = await readSceneState(page)
  expect(afterRestore.items[0].rotationY).toBeCloseTo(
    NORMALIZED_RIGHT_ROTATION_RADIANS,
    6,
  )
})

test('supports keyboard-driven furniture picker flow', async ({ page }) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })

  await tabTo(page, pickerTrigger)

  await page.keyboard.press('Enter')

  const couchRadio = page.locator(
    'input[name="furniture-catalog"][value="couch-1"]',
  )
  const armchairRadio = page.locator(
    'input[name="furniture-catalog"][value="armchair-1"]',
  )

  await expect(couchRadio).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(armchairRadio).toBeChecked()

  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused()

  await page.keyboard.press('Tab')
  const addButton = page.getByRole('button', { name: 'Add Item' })
  await expect(addButton).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('#add-furniture-sheet')).toBeHidden()

  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)

  const addedState = await readSceneState(page)
  expect(addedState.selectedName).toBe('Leather Armchair')

  await expect(pickerTrigger).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('#add-furniture-sheet')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#add-furniture-sheet')).toBeHidden()
  await expect(pickerTrigger).toBeFocused()
})
