import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './support/axe'
import {
  openEditor,
  readSceneState,
  selectOutlinerItemByKeyboard,
  waitForItemCount,
} from './support/editor-harness'

test('axe audit passes for baseline and outliner/selected item editor states', async ({
  page,
}) => {
  await openEditor(page)
  await expectNoA11yViolations(page, 'editor shell loaded')

  const keyboardHelpTrigger = page.getByRole('button', {
    name: 'Toggle keyboard shortcuts help',
  })
  await keyboardHelpTrigger.click()
  await expect(
    page.getByRole('heading', { name: 'Keyboard Shortcuts' }),
  ).toBeVisible()
  await expectNoA11yViolations(page, 'keyboard shortcuts popover open')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', { name: 'Keyboard Shortcuts' }),
  ).toBeHidden()

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

  const deleteButton = page.getByRole('button', {
    name: 'Remove item',
  })
  await expect(deleteButton).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Rotate counterclockwise' }),
  ).toBeEnabled()
  await expectNoA11yViolations(
    page,
    'selected item controls visible with actionable controls',
  )

  await page.getByRole('button', { name: 'Remove item' }).click()
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

  const state = await readSceneState(page)
  expect(state.itemCount).toBe(0)
})
