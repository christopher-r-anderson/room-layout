import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  readPoliteAnnouncement,
  readSceneState,
  waitForFirstItemPosition,
  waitForItemCount,
  waitForPoliteAnnouncement,
} from './support/editor-harness'

test('applies Arrow, Shift+Arrow, and Alt+Arrow movement steps in no-mouse flow', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const outlinerButton = page.getByRole('button', { name: /^Leather Couch/i })
  await outlinerButton.click()

  const initialState = await readSceneState(page)
  const initialX = initialState.items[0].position[0]

  await page.locator('body').press('ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeCloseTo(initialX + 0.5, 6)

  await page.locator('body').press('Shift+ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeCloseTo(initialX + 1.5, 6)

  await page.locator('body').press('Alt+ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeCloseTo(initialX + 1.6, 6)
})

test('keeps announcements deterministic and reconciles focus on undo selection loss', async ({
  page,
}) => {
  await openEditor(page)
  const addedState = await addFurniture(page, 'Leather Couch')
  const initialPosition = addedState.items[0].position

  await page.getByRole('button', { name: /^Leather Couch/i }).click()

  await page.locator('body').press('ArrowRight')
  await page.locator('body').press('Control+z')

  await waitForPoliteAnnouncement(page, 'Undo complete.')

  // Wait beyond delayed movement announcement window and assert no stale overwrite.
  await page.waitForTimeout(260)
  expect(await readPoliteAnnouncement(page)).toBe('Undo complete.')

  await waitForFirstItemPosition(page, initialPosition)

  await page.locator('body').press('Control+z')
  await waitForItemCount(page, 0)
  await waitForPoliteAnnouncement(page, 'Undo complete.')
  await expect(
    page.getByRole('region', { name: 'Furniture in room' }),
  ).toBeFocused()
})

test('keeps undo and redo parity across command and drag movement paths', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialPosition = addedState.items[0].position

  await page.getByRole('button', { name: 'Move right' }).click()

  const afterCommandMove = await readSceneState(page)
  const commandPosition = afterCommandMove.items[0].position

  expect(commandPosition).not.toEqual(initialPosition)

  const afterDragMove = await dragSelectedFurniture(page, {
    x: 150,
    y: 30,
  })
  const dragPosition = afterDragMove.items[0].position

  expect(dragPosition).not.toEqual(commandPosition)

  await page.locator('body').press('Control+z')
  await waitForFirstItemPosition(page, commandPosition)

  await page.locator('body').press('Control+z')
  await waitForFirstItemPosition(page, initialPosition)

  await page.locator('body').press('Control+y')
  await waitForFirstItemPosition(page, commandPosition)

  await page.locator('body').press('Control+y')
  await waitForFirstItemPosition(page, dragPosition)
})
