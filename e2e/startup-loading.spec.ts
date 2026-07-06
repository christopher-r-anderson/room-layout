import { expect, test } from '@playwright/test'
import {
  GATED_RESTORE_ITEM,
  delayFurnitureAssetRequests,
  expectSceneFlags,
  makeSceneRoute,
  waitForEditorReady,
} from './support/editor-harness'

test('keeps the editor chrome unmounted until the restored scene assets finish loading', async ({
  page,
}) => {
  const delayedAssets = await delayFurnitureAssetRequests(page)

  // A restored scene gates on its collections, so the delayed furniture request
  // holds the loader up until it is released.
  await page.goto(makeSceneRoute([GATED_RESTORE_ITEM]))

  const loader = page.getByRole('status', { name: /loading the room/i })
  await expect(loader).toBeVisible()
  // The loader is a live status region with a progress readout, not a dialog.
  await expect(
    page.getByRole('dialog', { name: /loading the room/i }),
  ).toHaveCount(0)
  await expect(loader.getByRole('progressbar')).toBeVisible()
  // The chrome is code-split and mounts only once the editor is ready, so no
  // editor controls exist in the DOM while the gated assets load.
  await expect(
    page.getByRole('button', { name: 'Undo', includeHidden: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Add Furniture', includeHidden: true }),
  ).toHaveCount(0)

  await expectSceneFlags(page, {
    assetsReady: false,
    assetError: false,
  })

  delayedAssets.release()

  await waitForEditorReady(page)
  await expect(loader).toBeHidden()
})

test('unlocks an empty scene without waiting for any furniture to load', async ({
  page,
}) => {
  // Environment-first: an empty scene gates on no collections, so even with all
  // furniture requests held indefinitely the editor still reaches ready. The
  // furniture catalog then loads lazily on demand.
  await delayFurnitureAssetRequests(page)

  await page.goto('/')

  const state = await waitForEditorReady(page)
  expect(state.itemCount).toBe(0)
})
