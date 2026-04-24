import { expect, test } from '@playwright/test'
import {
  delayFurnitureAssetRequests,
  expectSceneFlags,
  waitForEditorReady,
} from './support/editor-harness'

test('keeps editor interactions blocked until required assets finish loading', async ({
  page,
}) => {
  const delayedAssets = await delayFurnitureAssetRequests(page)

  await page.goto('/')

  const loadingHeading = page.getByText('Preparing the room editor')
  await expect(loadingHeading).toBeVisible()
  const inertShell = page.locator('[inert][aria-hidden="true"]')
  await expect(inertShell).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Undo', includeHidden: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Redo', includeHidden: true }),
  ).toBeDisabled()

  await expectSceneFlags(page, {
    assetsReady: false,
    assetError: false,
  })

  delayedAssets.release()

  await waitForEditorReady(page)
  await expect(loadingHeading).toBeHidden()
})
