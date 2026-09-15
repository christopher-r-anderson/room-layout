/**
 * Axe (WCAG A/AA, whole page, zero disables) over the feedback-layer states:
 * toasts over the shell and over an open modal drawer, both startup overlays,
 * the inline field-error state, and the keyboard-focused notifications
 * region. Each test builds one state and scans it; the general editor states
 * are covered by `e2e/editor-a11y-audits.spec.ts`.
 */
import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './support/axe'
import {
  EDITOR_READY_TIMEOUT_MS,
  GATED_RESTORE_ITEM,
  addFurniture,
  attemptFailingAdd,
  delayFurnitureAssetRequests,
  failFurnitureAssetRequestsUntilRetry,
  makeSceneRoute,
  openEditor,
  waitForEditorReady,
} from './support/editor-harness'
import { toastViewport, waitForToast } from './support/toasts'

test('error toast over the editor shell', async ({ page }) => {
  await page.goto('/?scene=!!!garbage!!!')
  await waitForEditorReady(page)
  await waitForToast(page, {
    text: 'Shared link could not be restored.',
    type: 'error',
  })

  await expectNoA11yViolations(page, 'error toast over editor shell')
})

test('error toast over the open catalog drawer', async ({ page }) => {
  await failFurnitureAssetRequestsUntilRetry(page)
  await page.goto('/')
  await waitForEditorReady(page)

  const picker = await attemptFailingAdd(page, 'Leather Couch')
  await waitForToast(page, { text: "Couldn't load that item", type: 'error' })
  await expect(picker).toBeVisible()

  await expectNoA11yViolations(page, 'error toast over open catalog drawer')
})

test('startup error overlay', async ({ page }) => {
  await failFurnitureAssetRequestsUntilRetry(page)

  // A restored scene gates startup on its collections, so the blocked
  // furniture request surfaces as the startup-fatal error overlay.
  await page.goto(makeSceneRoute([GATED_RESTORE_ITEM]))

  await expect(
    page.getByRole('alert', { name: /the room editor could not start/i }),
  ).toBeVisible({ timeout: EDITOR_READY_TIMEOUT_MS })
  await expect(
    page.getByRole('button', { name: 'Retry Loading' }),
  ).toBeVisible()

  await expectNoA11yViolations(page, 'startup error overlay')
})

test('startup loading state', async ({ page }) => {
  const delayedAssets = await delayFurnitureAssetRequests(page)

  // The gated ?scene= link holds the loader up until the requests release.
  await page.goto(makeSceneRoute([GATED_RESTORE_ITEM]))

  const loader = page.getByRole('status', { name: /loading the room/i })
  await expect(loader).toBeVisible()
  await expectNoA11yViolations(page, 'startup loading overlay')
  await expect(loader).toBeVisible()

  // Unblock so the page shuts down cleanly rather than with routes in flight.
  delayedAssets.release()
  await waitForEditorReady(page)
})

test('details-panel field error state', async ({ page }) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const xInput = page.getByLabel('Distance from left wall (m)')
  await xInput.fill('1.2x')
  await xInput.press('Enter')
  await expect(xInput).toHaveAttribute('aria-invalid', 'true')

  await expectNoA11yViolations(page, 'details-panel field error')
})

test('notifications region focused via F6 with an error toast up', async ({
  page,
}) => {
  await page.goto('/?scene=!!!garbage!!!')
  await waitForEditorReady(page)
  await waitForToast(page, {
    text: 'Shared link could not be restored.',
    type: 'error',
  })

  // Focusing the viewport lifts the aria-hidden from the high-priority toast
  // root - the state where the toast's own subtree is exposed to AT.
  await page.keyboard.press('F6')
  await expect(toastViewport(page)).toBeFocused()

  await expectNoA11yViolations(page, 'notifications region focused via F6')
})
