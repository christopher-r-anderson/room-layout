import { expect, test } from '@playwright/test'
import {
  delayFurnitureAssetRequests,
  readSceneState,
  waitForEditorReady,
} from './support/editor-harness'

test('keeps editor interactions blocked until required assets finish loading', async ({
  page,
}) => {
  const delayedAssets = await delayFurnitureAssetRequests(page)

  await page.goto('/')

  const loadingDialog = page.getByRole('dialog', {
    name: /preparing the room editor/i,
  })
  await expect(loadingDialog).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add Furniture', includeHidden: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Undo', includeHidden: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Redo', includeHidden: true }),
  ).toBeDisabled()

  const blockedState = await readSceneState(page)
  expect(blockedState.assetsReady).toBe(false)
  expect(blockedState.assetError).toBe(false)

  delayedAssets.release()

  await waitForEditorReady(page)
  await expect(loadingDialog).toBeHidden()
})
