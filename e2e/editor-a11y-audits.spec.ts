import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './support/axe'
import {
  openEditor,
  readSceneState,
  waitForItemCount,
} from './support/editor-harness'

test('axe audit passes for baseline and outliner/inspector editor states', async ({
  page,
}) => {
  await openEditor(page)
  await expectNoA11yViolations(page, 'editor shell loaded')

  await page.getByRole('button', { name: 'Add Furniture' }).click()
  const pickerDialog = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerDialog).toBeVisible()
  await expectNoA11yViolations(page, 'catalog drawer open')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Add Furniture' }).click()
  await expect(pickerDialog).toBeVisible()
  await expect(
    pickerDialog.getByRole('radio', { name: 'Leather Couch' }),
  ).toBeChecked()
  await pickerDialog.getByRole('button', { name: 'Add Item' }).click()
  await expect(pickerDialog).toBeHidden()

  const outlinerSelectionButton = page.getByRole('button', {
    name: /^Leather Couch/i,
  })
  await outlinerSelectionButton.click()
  await expectNoA11yViolations(page, 'outliner visible with selected item')

  const deleteButton = page.getByRole('button', {
    name: 'Delete',
  })
  await expect(deleteButton).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Rotate Left' })).toBeEnabled()
  await expectNoA11yViolations(
    page,
    'inspector visible with actionable controls',
  )

  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(
    page.getByRole('alertdialog', { name: /delete furniture/i }),
  ).toBeVisible()
  await expectNoA11yViolations(page, 'delete dialog open')

  await page
    .getByRole('alertdialog', { name: /delete furniture/i })
    .getByRole('button', { name: 'Delete' })
    .click()

  await waitForItemCount(page, 0)
  await expect(page.getByText('No furniture in the room.')).toBeVisible()
  await expectNoA11yViolations(page, 'outliner empty state after delete')

  const state = await readSceneState(page)
  expect(state.itemCount).toBe(0)
})
