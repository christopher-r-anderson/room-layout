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
  // The loading gate is a labelled region, not a dialog.
  await expect(
    page.getByRole('dialog', { name: /preparing the room editor/i }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: /preparing the room editor/i }),
  ).toBeVisible()
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
