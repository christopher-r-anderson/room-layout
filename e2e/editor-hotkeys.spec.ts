import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  waitForFirstItemRotationY,
  waitForItemCount,
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
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialItem = addedState.items[0]

  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })
  await infoButton.click()
  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })
  await expect(infoDialog).toBeVisible()

  await page.locator('body').press('e')
  await page.locator('body').press('Control+z')
  await page.locator('body').press('Delete')

  const whileInfoOpen = await readSceneState(page)
  expect(whileInfoOpen.items[0].rotationY).toBeCloseTo(initialItem.rotationY, 6)
  await expect(
    page.getByRole('alertdialog', { name: /delete furniture/i }),
  ).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(infoDialog).toBeHidden()

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  await pickerTrigger.click()
  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()

  await page.locator('body').press('e')
  await page.locator('body').press('Delete')

  const whileSheetOpen = await readSceneState(page)
  expect(whileSheetOpen.items[0].rotationY).toBeCloseTo(
    initialItem.rotationY,
    6,
  )
  await expect(
    page.getByRole('alertdialog', { name: /delete furniture/i }),
  ).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(pickerSheet).toBeHidden()

  await page.locator('body').press('e')
  const afterRotate = await waitForFirstItemRotationY(
    page,
    NORMALIZED_RIGHT_ROTATION_RADIANS,
    6,
  )
  expect(afterRotate.selectedName).toBe('Leather Couch')

  await page.locator('body').press('Control+z')
  await waitForFirstItemRotationY(page, initialItem.rotationY)

  const afterUndo = await readSceneState(page)
  expect(afterUndo.itemCount).toBe(1)
  expect(afterUndo.selectedName).toBe('Leather Couch')

  await page.locator('body').press('Control+y')
  await waitForFirstItemRotationY(page, NORMALIZED_RIGHT_ROTATION_RADIANS, 6)

  await page.locator('body').press('Delete')
  const deleteDialog = page.getByRole('alertdialog', {
    name: /delete furniture/i,
  })
  await expect(deleteDialog).toBeVisible()

  await page.locator('body').press('Control+z')
  await waitForFirstItemRotationY(page, NORMALIZED_RIGHT_ROTATION_RADIANS, 6)
  await expect(deleteDialog).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Delete' }).click()
  await waitForItemCount(page, 0)

  await page.locator('body').press('Control+z')
  await waitForItemCount(page, 1)

  const afterRestore = await readSceneState(page)
  expect(afterRestore.items[0].rotationY).toBeCloseTo(
    NORMALIZED_RIGHT_ROTATION_RADIANS,
    6,
  )
})

test('supports keyboard-driven furniture picker flow', async ({ page }) => {
  await openEditor(page)

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })

  await tabTo(page, pickerTrigger)

  await page.keyboard.press('Enter')

  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()

  const couchRadio = page.locator(
    'input[name="furniture-catalog"][value="couch-1"]',
  )
  const armchairRadio = page.locator(
    'input[name="furniture-catalog"][value="armchair-1"]',
  )

  await expect(couchRadio).toBeChecked()

  await page.keyboard.press('Tab')
  await page.keyboard.press('ArrowDown')
  await expect(armchairRadio).toBeChecked()

  const addButton = page.getByRole('button', { name: 'Add Item' })
  await page.keyboard.press('Tab')
  await expect(addButton).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(pickerSheet).toBeHidden()

  await waitForItemCount(page, 1)

  const addedState = await readSceneState(page)
  expect(addedState.selectedName).toBe('Leather Armchair')

  await expect(pickerTrigger).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(pickerSheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(pickerSheet).toBeHidden()
  await expect(pickerTrigger).toBeFocused()
})
