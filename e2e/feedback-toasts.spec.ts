/**
 * Toast lifecycle: persistence, auto-dismissal, stacking, the F6 keyboard
 * path, and render-cost quiescence. Routing (which event class raises which
 * surface) is pinned in `e2e/feedback-routing.spec.ts`.
 *
 * Timer rule respected throughout: hovering the viewport pauses auto-dismiss
 * timers, so every timeout assertion first parks the mouse away from the
 * bottom-right toast corner.
 */
import { expect, test, type Page } from '@playwright/test'
import {
  addFurniture,
  failFurnitureAssetRequestsUntilRetry,
  focusRoomView,
  openEditor,
  readPerfCounters,
  resetPerfCounters,
  waitForEditorReady,
} from './support/editor-harness'
import {
  dismissToast,
  expectNoToasts,
  readToastTexts,
  toastRoots,
  toastViewport,
  waitForToast,
} from './support/toasts'

const ADD_FAILURE_TEXT =
  "Couldn't load that item. Check your connection and try again."

// Success toasts auto-dismiss in 5s; waiting a bounded 6s and still seeing the
// error pins its `timeout: 0` (a regression to any auto-dismiss timeout fails).
const ERROR_PERSISTENCE_PROBE_MS = 6_000

/**
 * With furniture requests blocked, attempts an add from the open catalog
 * drawer. Each distinct collection loads separately, so items from different
 * collections raise distinct error toasts.
 */
async function attemptFailingAdd(page: Page, itemName: string) {
  const picker = page.getByRole('dialog', { name: 'Add furniture' })

  if (!(await picker.isVisible())) {
    await page.getByRole('button', { name: 'Add Furniture' }).click()
    await expect(picker).toBeVisible()
  }

  await picker.getByText(itemName, { exact: true }).click()
  await expect(picker.getByRole('radio', { name: itemName })).toBeChecked()
  await picker.getByRole('button', { name: 'Add Item' }).click()
}

test('error toast over the open catalog drawer persists and is dismissible', async ({
  page,
}) => {
  await failFurnitureAssetRequestsUntilRetry(page)
  await page.goto('/')
  await waitForEditorReady(page)

  await attemptFailingAdd(page, 'Leather Couch')

  // Visible over the open drawer: the viewport portals to body at z-60, above
  // the drawer's z-50.
  const picker = page.getByRole('dialog', { name: 'Add furniture' })
  const toast = await waitForToast(page, {
    text: ADD_FAILURE_TEXT,
    type: 'error',
  })
  await expect(picker).toBeVisible()

  // Park the mouse away from the viewport (hover pauses dismiss timers, which
  // would make this persistence probe vacuous), then outwait the 5s success
  // timeout: the error must still be there.
  await page.mouse.move(5, 5)
  await page.waitForTimeout(ERROR_PERSISTENCE_PROBE_MS)
  await expect(toast).toBeVisible()

  // The drawer's focus trap wins over F6, so close it before dismissing.
  await page.keyboard.press('Escape')
  await expect(picker).toBeHidden()

  await dismissToast(page, toast)
  await expectNoToasts(page)

  // Keyboard dismissal hands focus back to the element focused before F6
  // entered the viewport - here the catalog trigger, which the closing drawer
  // had restored focus to. (A pointer click on Close would instead drop focus
  // to body - dismissToast dismisses via Enter for exactly this reason.)
  await expect(
    page.getByRole('button', { name: 'Add Furniture' }),
  ).toBeFocused()
})

test('success toast auto-dismisses', async ({ page }) => {
  await openEditor(page)
  // Start Over stays disabled until the scene diverges from defaults.
  await addFurniture(page, 'Leather Armchair')

  await page.getByRole('button', { name: 'Start over' }).click()
  const confirmDialog = page.getByRole('alertdialog', { name: /start over\?/i })
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole('button', { name: 'Start Over' }).click()

  const toast = await waitForToast(page, {
    text: 'Started over. Your changes were cleared.',
    type: 'success',
  })

  // Keep the mouse off the viewport so the 5s timer actually runs; the
  // 10s expect timeout comfortably bounds the ~5s + exit animation.
  await page.mouse.move(5, 5)
  await expect(toast).toBeHidden()
  await expectNoToasts(page)
})

test('toasts stack and dismiss independently', async ({ page }) => {
  await failFurnitureAssetRequestsUntilRetry(page)
  await page.goto('/')
  await waitForEditorReady(page)

  // Two failures from two different collections raise two distinct error
  // toasts (same message text - the failures are per collection load).
  await attemptFailingAdd(page, 'Leather Couch')
  await expect(toastRoots(page)).toHaveCount(1)
  await attemptFailingAdd(page, 'End Table')
  await expect(toastRoots(page)).toHaveCount(2)
  expect(await readToastTexts(page)).toHaveLength(2)

  // Close the drawer first: its focus trap would swallow the F6 that
  // dismissToast needs.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Add furniture' })).toBeHidden()

  await dismissToast(page, toastRoots(page).first())

  // The other toast is untouched.
  await expect(toastRoots(page)).toHaveCount(1)
  await expect(toastRoots(page).first()).toContainText(ADD_FAILURE_TEXT)
})

test('stack cap hides over-limit toasts', async ({ page }) => {
  await failFurnitureAssetRequestsUntilRetry(page)
  await page.goto('/')
  await waitForEditorReady(page)

  // Four persistent errors from four distinct collections.
  const itemsFromDistinctCollections = [
    'Leather Couch',
    'End Table',
    'Modern Coffee Table',
    'Classic Coffee Table',
  ]
  for (const [index, itemName] of itemsFromDistinctCollections.entries()) {
    await attemptFailingAdd(page, itemName)
    await expect(toastRoots(page)).toHaveCount(index + 1)
  }

  // Base UI keeps over-limit toasts in the list as inert `data-limited`
  // placeholders (display:none via the toast styles) rather than dropping
  // them: four roots exist, at most three are visible.
  await expect(toastRoots(page)).toHaveCount(4)
  await expect(toastRoots(page).locator('visible=true')).toHaveCount(3)
  await expect(
    toastRoots(page).and(page.locator('[data-limited]')),
  ).toHaveCount(1)
})

test('F6 focuses the notifications region and is a no-op with no toasts', async ({
  page,
}) => {
  // Cheapest persistent error: an invalid share link raises one at startup.
  await page.goto('/?scene=!!!garbage!!!')
  await waitForEditorReady(page)
  const toast = await waitForToast(page, {
    text: 'Shared link could not be restored.',
    type: 'error',
  })

  // With a toast up, F6 (Base UI's global listener) focuses the viewport
  // itself - the region landmark becomes document.activeElement.
  await page.keyboard.press('F6')
  await expect(toastViewport(page)).toBeFocused()

  await dismissToast(page, toast)
  await expectNoToasts(page)

  // With no toasts the viewport is unmounted, so F6 has nothing to focus:
  // focus stays where it was.
  await focusRoomView(page)
  await page.keyboard.press('F6')
  await expect(
    page.getByRole('region', { name: 'Interactive 3D room editor' }),
  ).toBeFocused()
})

// Deterministic render-cost gate (mirrors selected-toolbar-idle.spec.ts):
// raising a toast must stay inside the toast provider's own subtree. A
// regression that routes toast state through the app shell (a context at the
// root, a store the App subscribes to) re-renders App or Scene and pushes a
// counter above zero.
//
// The trigger is the clipboard-failure error toast, not an add failure: a
// failing add runs a collection-load lifecycle whose store transitions
// legitimately re-render the Scene (measured sceneRenders=2), which would
// drown the signal this test exists for. The share flow only reads scene
// state; on clipboard failure its sole side effects are the error toast and
// the share button's local pending state.
test('raising a toast keeps the app shell quiescent', async ({ page }) => {
  // No granted clipboard permission, and native share forced off, so the
  // share click deterministically fails into feedback.actionError.
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: undefined,
    })
  })
  await openEditor(page)

  await resetPerfCounters(page)
  await page.getByRole('button', { name: 'Share room layout' }).click()
  await waitForToast(page, {
    text: 'Could not copy URL to clipboard.',
    type: 'error',
  })

  // A settle window after the toast is visible, so any stray shell re-render
  // scheduled by the failure path has had time to land before reading.
  await page.waitForTimeout(300)
  const counters = await readPerfCounters(page)

  expect(counters.sceneRenders).toBe(0)
  expect(counters.appRenders).toBe(0)
})
