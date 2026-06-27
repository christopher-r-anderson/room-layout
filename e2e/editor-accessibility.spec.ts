import { expect, test } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  selectOutlinerItemByKeyboard,
  updateSelectedItemField,
  waitForPoliteAnnouncement,
  waitForItemCount,
} from './support/editor-harness'

test('supports outliner selection and selected item details without the canvas', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await addFurniture(page, 'End Table')
  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)

  await expect
    .poll(async () => (await readSceneState(page)).selectedName)
    .toBe('Leather Couch')

  const beforeMove = await readSceneState(page)
  const selectedBeforeMove = beforeMove.items.find(
    (item) => item.id === beforeMove.selectedId,
  )

  if (!selectedBeforeMove) {
    throw new Error('expected a selected furniture item before details edit')
  }

  await updateSelectedItemField(page, 'Distance from left wall (m)', '1.4')

  // The field edit applies through the panel→command→scene pipeline without the
  // canvas; the exact resolved coordinate is owned by the wall-clearance /
  // detail-action unit tests.
  await expect
    .poll(async () => {
      const sceneState = await readSceneState(page)
      return sceneState.items.find((item) => item.id === sceneState.selectedId)
        ?.position[0]
    })
    .not.toBe(selectedBeforeMove.position[0])

  await page
    .getByRole('toolbar', { name: 'Selected item actions' })
    .getByRole('button', { name: 'Remove item' })
    .click()
  await page
    .getByRole('alertdialog', { name: /remove item from room/i })
    .getByRole('button', { name: 'Remove item' })
    .click()

  await waitForItemCount(page, 1)
  await waitForPoliteAnnouncement(page, 'Leather Couch removed from room.')
  await expect(page.getByRole('button', { name: /^End Table/i })).toBeFocused()
  await expect(
    page.getByRole('button', { name: /^Leather Couch/i }),
  ).toHaveCount(0)
})
