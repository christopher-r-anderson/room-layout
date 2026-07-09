import { expect, test, type Page } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  failFurnitureAssetRequestsUntilRetry,
  openEditor,
  readSceneState,
  waitForEditorReady,
} from './support/editor-harness'
import { waitForToast } from './support/toasts'

function expectUniqueItemIds(itemIds: string[]) {
  expect(new Set(itemIds).size).toBe(itemIds.length)
}

async function expectNoSafePlacementError(page: Page) {
  await expect(
    page.getByText(
      'No safe placement slot is available for that furniture item.',
    ),
  ).toBeHidden()
}

test('keeps successful adds free of false no-space errors and duplicate ids', async ({
  page,
}) => {
  await openEditor(page)

  const firstAddState = await addFurniture(page, 'Leather Couch')
  expect(firstAddState.itemCount).toBe(1)

  // Move the first couch aside so the second identical couch has an open spawn
  // slot (otherwise placement-search would report no space).
  const draggedState = await dragSelectedFurniture(page, {
    x: 1200,
    y: 0,
  })
  expect(draggedState.items[0].position).not.toEqual(
    firstAddState.items[0].position,
  )

  const secondAddState = await addFurniture(page, 'Leather Couch')
  expect(secondAddState.itemCount).toBe(2)
  expectUniqueItemIds(secondAddState.items.map((item) => item.id))
  await expectNoSafePlacementError(page)

  const thirdAddState = await addFurniture(page, 'Leather Armchair')
  expect(thirdAddState.itemCount).toBe(3)
  expectUniqueItemIds(thirdAddState.items.map((item) => item.id))
  await expectNoSafePlacementError(page)

  expect(thirdAddState.selectedName).toBe('Leather Armchair')
})

test('surfaces an error and recovers when an added item fails to load', async ({
  page,
}) => {
  const assetFailure = await failFurnitureAssetRequestsUntilRetry(page)

  // Empty scene unlocks despite failing furniture requests (environment-first);
  // the failure only bites when the user adds an item whose model must load.
  await page.goto('/')
  await waitForEditorReady(page)

  const picker = page.getByRole('dialog', { name: 'Add furniture' })
  await page.getByRole('button', { name: 'Add Furniture' }).click()
  await expect(picker).toBeVisible()
  await picker.getByText('Leather Couch', { exact: true }).click()
  await picker.getByRole('button', { name: 'Add Item' }).click()

  // Instead of hanging on "Adding...", the add reports the failure on both
  // channels - a toast visible over the drawer, and an assertive announcement
  // (the drawer's aria-hiding exempts live regions) - adds nothing, and the
  // button recovers.
  await waitForToast(page, { text: 'Check your connection', type: 'error' })
  await expect(
    page.locator('[data-announcer-channel="assertive"]'),
  ).toContainText('Check your connection')
  await expect(picker.getByRole('button', { name: 'Add Item' })).toBeEnabled()
  expect((await readSceneState(page)).itemCount).toBe(0)

  // Retrying after the network recovers succeeds.
  assetFailure.allowRequests()
  await picker.getByRole('button', { name: 'Add Item' }).click()
  await expect(picker).toBeHidden()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)
})

test('marks a permanently-unavailable item and blocks adding it', async ({
  page,
}) => {
  // A 404 (missing/broken asset) is a permanent failure, unlike a dropped
  // connection: the item is marked unavailable rather than left retry-able.
  await page.route(/\/models\/.+\.glb(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 404 }),
  )
  await page.goto('/')
  await waitForEditorReady(page)

  const picker = page.getByRole('dialog', { name: 'Add furniture' })
  await page.getByRole('button', { name: 'Add Furniture' }).click()
  await expect(picker).toBeVisible()
  await picker.getByText('Leather Couch', { exact: true }).click()

  // Prefetch-on-select loads (and 404s) the model, so the item becomes
  // unavailable and cannot be added.
  await expect(picker.getByText('Unavailable').first()).toBeVisible()
  await expect(
    picker.getByRole('radio', { name: 'Leather Couch' }),
  ).toBeDisabled()
  await expect(picker.getByRole('button', { name: 'Add Item' })).toBeDisabled()
  expect((await readSceneState(page)).itemCount).toBe(0)
})
