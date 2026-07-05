import { expect, test } from '@playwright/test'
import {
  EDITOR_READY_TIMEOUT_MS,
  GATED_RESTORE_ITEM,
  expectSceneFlags,
  failFurnitureAssetRequestsUntilRetry,
  makeSceneRoute,
  waitForEditorReady,
} from './support/editor-harness'

test("shows a retry path when a restored scene's furniture assets fail to load", async ({
  page,
}) => {
  const assetFailure = await failFurnitureAssetRequestsUntilRetry(page)

  // A restored scene gates on its collections, so a failed furniture request
  // surfaces as a startup error (an empty scene would just unlock).
  await page.goto(makeSceneRoute([GATED_RESTORE_ITEM]))

  const errorHeading = page.getByText('The room editor could not start')
  await expect(errorHeading).toBeVisible({ timeout: EDITOR_READY_TIMEOUT_MS })
  await expect(
    page.getByRole('alert', { name: /the room editor could not start/i }),
  ).toBeVisible()

  await expectSceneFlags(page, {
    assetsReady: false,
    assetError: true,
  })

  const retryButton = page.getByRole('button', { name: 'Retry Loading' })
  await expect(retryButton).toBeVisible()

  assetFailure.allowRequests()
  await retryButton.click()

  const recoveredState = await waitForEditorReady(page)
  expect(recoveredState.assetsReady).toBe(true)
  expect(recoveredState.assetError).toBe(false)
  expect(recoveredState.itemCount).toBe(1)
})

test('does not error an empty scene when a background furniture request fails', async ({
  page,
}) => {
  // On-demand collections load in isolation, so a failing furniture request must
  // not error the editor for an empty scene - it just unlocks with no items.
  await failFurnitureAssetRequestsUntilRetry(page)

  await page.goto('/')

  const state = await waitForEditorReady(page)
  expect(state.assetError).toBe(false)
  expect(state.itemCount).toBe(0)
})

test('surfaces a failed engine chunk as a startup error and recovers on retry', async ({
  page,
}) => {
  // A stale deploy or dropped connection can 404/abort the lazy engine chunk;
  // that must surface the startup error + retry, not crash the React tree.
  let blockEngineChunk = true
  await page.route(/\/assets\/scene-canvas-.*\.js(?:\?.*)?$/, (route) => {
    if (blockEngineChunk) {
      return route.abort()
    }
    return route.continue()
  })

  await page.goto('/')

  const errorHeading = page.getByText('The room editor could not start')
  await expect(errorHeading).toBeVisible({ timeout: EDITOR_READY_TIMEOUT_MS })

  blockEngineChunk = false
  await page.getByRole('button', { name: 'Retry Loading' }).click()

  const state = await waitForEditorReady(page)
  expect(state.assetError).toBe(false)
})
