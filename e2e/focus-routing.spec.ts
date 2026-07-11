import { expect, test, type Page } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  waitForItemCount,
  waitForPoliteAnnouncement,
} from './support/editor-harness'

// Focus-intent routing across layouts: intents resolve to a mounted surface at
// request time, so an operation on mobile must never leave a directive behind
// that a later desktop outliner mount would realize as a focus steal.

const MOBILE_VIEWPORT = { width: 390, height: 844 }
const DESKTOP_VIEWPORT = { width: 1280, height: 800 }

function outlinerRegion(page: Page) {
  return page.getByRole('region', { name: 'Furniture in room' })
}

test('mobile undo leaves no focus intent for a later desktop outliner', async ({
  page,
}) => {
  await page.setViewportSize(MOBILE_VIEWPORT)
  await openEditor(page)
  await addFurniture(page)

  const undoButton = page.getByRole('button', { name: 'Undo' })
  await undoButton.click()
  await waitForItemCount(page, 0)
  await waitForPoliteAnnouncement(page, 'Undo complete.')

  await page.setViewportSize(DESKTOP_VIEWPORT)
  await expect(outlinerRegion(page)).toBeVisible()

  await expect(outlinerRegion(page)).not.toBeFocused()
  await expect(
    outlinerRegion(page).getByRole('button', { name: /toggle/i }),
  ).not.toBeFocused()
})

test('mobile toolbar delete repairs focus to the scene', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT)
  await openEditor(page)
  await addFurniture(page)

  await page.getByRole('button', { name: 'Remove item' }).click()
  const confirmDialog = page.getByRole('alertdialog')
  await confirmDialog.getByRole('button', { name: 'Remove item' }).click()
  await waitForItemCount(page, 0)

  await expect(
    page.getByRole('region', { name: 'Interactive 3D room editor' }),
  ).toBeFocused()

  await page.setViewportSize(DESKTOP_VIEWPORT)
  await expect(outlinerRegion(page)).toBeVisible()
  await expect(outlinerRegion(page)).not.toBeFocused()
})

test('desktop toolbar delete lands on the neighbor item in the collection', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_VIEWPORT)
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await addFurniture(page, 'End Table')

  await page.getByRole('button', { name: 'Remove item' }).click()
  const confirmDialog = page.getByRole('alertdialog')
  await confirmDialog.getByRole('button', { name: 'Remove item' }).click()
  await waitForItemCount(page, 1)

  await expect(
    outlinerRegion(page).getByRole('button', { name: /^Leather Couch/i }),
  ).toBeFocused()
})
