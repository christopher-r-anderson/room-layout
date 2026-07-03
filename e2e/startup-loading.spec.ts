import { expect, test } from '@playwright/test'
import {
  delayFurnitureAssetRequests,
  expectSceneFlags,
  waitForEditorReady,
} from './support/editor-harness'

test('keeps the editor chrome unmounted until required assets finish loading', async ({
  page,
}) => {
  const delayedAssets = await delayFurnitureAssetRequests(page)

  await page.goto('/')

  const loader = page.getByRole('status', { name: /loading the room/i })
  await expect(loader).toBeVisible()
  // The loader is a live status region with a progress readout, not a dialog.
  await expect(
    page.getByRole('dialog', { name: /loading the room/i }),
  ).toHaveCount(0)
  await expect(loader.getByRole('progressbar')).toBeVisible()
  // The chrome is code-split and mounts only once the editor is ready, so no
  // editor controls exist in the DOM while the required assets load.
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
