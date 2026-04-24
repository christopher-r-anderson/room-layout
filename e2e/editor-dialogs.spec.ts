import { expect, test, type Locator, type Page } from '@playwright/test'
import { addFurniture, openEditor } from './support/editor-harness'

async function closeWithEscapeAndRestoreFocus(
  page: Page,
  dialog: Locator,
  focusTarget: Locator,
) {
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(focusTarget).toBeFocused()
}

test('project info dialog preserves repository metadata and returns focus', async ({
  page,
}) => {
  await openEditor(page)

  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })

  await infoButton.click()

  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })
  await expect(infoDialog).toBeVisible()

  await expect(
    infoDialog.getByRole('heading', { name: 'Repository' }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', { name: /christopher anderson/i }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', {
      name: /github.com\/christopher-r-anderson\/room-layout/i,
    }),
  ).toBeVisible()
  await expect(infoDialog.getByRole('link', { name: /^mit/i })).toBeVisible()

  await closeWithEscapeAndRestoreFocus(page, infoDialog, infoButton)
})

test('sheet and delete confirmation keep accessible contracts and return focus', async ({
  page,
}) => {
  await openEditor(page)

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  await pickerTrigger.click()

  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()
  await closeWithEscapeAndRestoreFocus(page, pickerSheet, pickerTrigger)

  await addFurniture(page, 'Leather Couch')

  const deleteButton = page.getByRole('button', { name: 'Delete' })
  await deleteButton.click()

  const deleteDialog = page.getByRole('alertdialog', {
    name: /delete furniture/i,
  })
  await expect(deleteDialog).toBeVisible()
  await expect(
    deleteDialog.getByText(/delete leather couch from the scene\?/i),
  ).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(deleteButton).toBeFocused()
})
