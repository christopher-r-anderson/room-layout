import { expect, test } from '@playwright/test'
import {
  EDITOR_READY_TIMEOUT_MS,
  expectSceneFlags,
  failFurnitureAssetRequestsUntilRetry,
  waitForEditorReady,
} from './support/editor-harness'

test('shows a retry path when essential furniture assets fail to load', async ({
  page,
}) => {
  const assetFailure = await failFurnitureAssetRequestsUntilRetry(page)

  await page.goto('/')

  const errorHeading = page.getByText('The room editor could not start')
  await expect(errorHeading).toBeVisible({ timeout: EDITOR_READY_TIMEOUT_MS })
  const inertShell = page.locator('[inert][aria-hidden="true"]')
  await expect(inertShell).toBeVisible()

  await expectSceneFlags(page, {
    assetsReady: false,
    assetError: true,
  })

  const retryButton = page.getByRole('button', { name: 'Retry Loading' })
  await expect(retryButton).toBeVisible()

  assetFailure.allowRequests()
  await retryButton.click()

  await waitForEditorReady(page)

  const recoveredState = await expectSceneFlags(page, {
    assetsReady: true,
    assetError: false,
  })
  expect(recoveredState.itemCount).toBe(0)
})
