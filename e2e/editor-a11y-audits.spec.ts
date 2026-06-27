import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './support/axe'
import {
  openEditor,
  selectOutlinerItemByKeyboard,
  waitForItemCount,
} from './support/editor-harness'

test('axe audit passes for baseline and outliner/selected item editor states', async ({
  page,
}) => {
  await openEditor(page)
  await expectNoA11yViolations(page, 'editor shell loaded')

  const keyboardHelpTrigger = page.getByRole('button', {
    name: 'Keyboard shortcuts',
  })
  await keyboardHelpTrigger.click()
  const keyboardShortcutsDialog = page.getByRole('dialog', {
    name: 'Keyboard Shortcuts',
  })
  await expect(keyboardShortcutsDialog).toBeVisible()
  await expectNoA11yViolations(page, 'keyboard shortcuts dialog open')
  await page.keyboard.press('Escape')
  await expect(keyboardShortcutsDialog).toBeHidden()

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

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  await expectNoA11yViolations(page, 'outliner visible with selected item')

  const selectedItemActions = page.getByRole('toolbar', {
    name: 'Selected item actions',
  })
  const deleteButton = selectedItemActions.getByRole('button', {
    name: 'Remove item',
  })
  await expect(deleteButton).toBeEnabled()
  await expect(
    selectedItemActions.getByRole('button', {
      name: 'Rotate counterclockwise',
    }),
  ).toBeEnabled()
  await expectNoA11yViolations(
    page,
    'selected item controls visible with actionable controls',
  )

  await deleteButton.click()
  await expect(
    page.getByRole('alertdialog', { name: /remove item from room/i }),
  ).toBeVisible()
  await expectNoA11yViolations(page, 'delete dialog open')

  await page
    .getByRole('alertdialog', { name: /remove item from room/i })
    .getByRole('button', { name: 'Remove item' })
    .click()

  await waitForItemCount(page, 0)
  await expect(page.getByText('No furniture in the room.')).toBeVisible()
  await expectNoA11yViolations(page, 'outliner empty state after delete')
})
