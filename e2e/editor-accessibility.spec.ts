import { expect, test } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  waitForPoliteAnnouncement,
  waitForItemCount,
} from './support/editor-harness'

test('supports outliner selection and inspector movement without the canvas', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await addFurniture(page, 'End Table')

  const couchButton = page.getByRole('button', { name: /^Leather Couch/i })
  await couchButton.click()

  await expect
    .poll(async () => (await readSceneState(page)).selectedName)
    .toBe('Leather Couch')

  const beforeMove = await readSceneState(page)
  const selectedBeforeMove = beforeMove.items.find(
    (item) => item.id === beforeMove.selectedId,
  )

  if (!selectedBeforeMove) {
    throw new Error('expected a selected furniture item before inspector move')
  }

  await page.getByRole('button', { name: 'Move right' }).click()

  await expect
    .poll(async () => {
      const sceneState = await readSceneState(page)
      return sceneState.items.find((item) => item.id === sceneState.selectedId)
        ?.position[0]
    })
    .toBeCloseTo(selectedBeforeMove.position[0] + 0.5, 6)

  await page.getByRole('button', { name: 'Delete' }).click()
  await page
    .getByRole('alertdialog', { name: /delete furniture/i })
    .getByRole('button', { name: 'Delete' })
    .click()

  await waitForItemCount(page, 1)
  await waitForPoliteAnnouncement(page, 'Leather Couch removed from room.')
  await expect(page.getByRole('button', { name: /^End Table/i })).toBeFocused()
  await expect(
    page.getByRole('button', { name: /^Leather Couch/i }),
  ).toHaveCount(0)
})
