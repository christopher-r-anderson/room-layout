import { expect, test } from '@playwright/test'
import {
  failFurnitureAssetRequestsUntilRetry,
  readSceneState,
  waitForEditorReady,
} from './support/editor-harness'

test('shows a retry path when essential furniture assets fail to load', async ({
  page,
}) => {
  const assetFailure = await failFurnitureAssetRequestsUntilRetry(page)

  await page.goto('/')

  const errorDialog = page.getByRole('alertdialog', {
    name: /the room editor could not start/i,
  })
  await expect(errorDialog).toBeVisible({ timeout: 30_000 })
  await expect(
    page.getByRole('button', { name: 'Add Item', includeHidden: true }),
  ).toBeDisabled()

  const failedState = await readSceneState(page)
  expect(failedState.assetsReady).toBe(false)
  expect(failedState.assetError).toBe(true)

  assetFailure.allowRequests()
  await errorDialog.getByRole('button', { name: 'Retry Loading' }).click()

  await waitForEditorReady(page)

  const recoveredState = await readSceneState(page)
  expect(recoveredState.assetsReady).toBe(true)
  expect(recoveredState.assetError).toBe(false)
  expect(recoveredState.itemCount).toBe(0)
})
