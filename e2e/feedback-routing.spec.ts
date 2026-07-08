/**
 * Browser twin of the feedback routing in `core/stores/feedback-store.ts`:
 * one test per representative event class, asserting both the surface that
 * fires and the surfaces that stay silent. Toast lifecycle lives in
 * `e2e/feedback-toasts.spec.ts`.
 */
import { expect, test } from '@playwright/test'
import {
  addFurniture,
  expectAssertiveAnnouncementUnchanged,
  expectPoliteAnnouncementUnchanged,
  failFurnitureAssetRequestsUntilRetry,
  focusRoomView,
  openEditor,
  readAssertiveAnnouncement,
  readPoliteAnnouncement,
  readSceneState,
  selectOutlinerItemByKeyboard,
  waitForEditorReady,
  waitForPoliteAnnouncement,
} from './support/editor-harness'
import { expectNoToasts, waitForToast } from './support/toasts'

test('selection via the outliner announces politely and raises no toast', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await addFurniture(page, 'End Table')

  // The second add left End Table selected; settle on its add announcement so
  // the selection assertion below can only be satisfied by the selection event.
  await waitForPoliteAnnouncement(page, 'End Table added to room.')
  const assertiveBefore = await readAssertiveAnnouncement(page)

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)

  await waitForPoliteAnnouncement(page, 'Leather Couch selected.')
  await expectNoToasts(page)
  await expectAssertiveAnnouncementUnchanged(page, assertiveBefore)
})

test('keyboard move announces debounced on the polite channel with no toast', async ({
  page,
}) => {
  await openEditor(page)
  const addedState = await addFurniture(page, 'Leather Couch')
  const initialX = addedState.items[0].position[0]

  await waitForPoliteAnnouncement(page, 'Leather Couch added to room.')

  await focusRoomView(page)
  await page.keyboard.press('ArrowRight')

  // The 180 ms debounce window itself is unit-owned (feedback.test.ts /
  // feedback-store.test.ts): asserting "nothing announced yet" here would
  // race the timer under CI load. This test pins the settled outcome.

  // Compute the settled announcement from the scene's own resolved position
  // (formatDistanceMeters: long-form meters, max one fraction digit).
  await expect
    .poll(async () => (await readSceneState(page)).items[0]?.position[0])
    .toBeGreaterThan(initialX)
  const [x, , z] = (await readSceneState(page)).items[0].position
  const meters = new Intl.NumberFormat('en', {
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'long',
    maximumFractionDigits: 1,
  })
  await waitForPoliteAnnouncement(
    page,
    `Leather Couch moved to X ${meters.format(x)} and Z ${meters.format(z)}.`,
  )

  await expectNoToasts(page)
  await expectAssertiveAnnouncementUnchanged(page, '')
})

test('undo announces politely only, with no toast', async ({ page }) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  await page.locator('body').press('Control+z')

  await waitForPoliteAnnouncement(page, 'Undo complete.')
  await expectNoToasts(page)
  await expectAssertiveAnnouncementUnchanged(page, '')
})

test('add failure raises an error toast only; both announcer channels stay silent', async ({
  page,
}) => {
  await failFurnitureAssetRequestsUntilRetry(page)

  // An empty scene unlocks despite the blocked furniture requests; the failure
  // only bites when the add tries to load the item's collection.
  await page.goto('/')
  await waitForEditorReady(page)

  const politeBefore = await readPoliteAnnouncement(page)
  const assertiveBefore = await readAssertiveAnnouncement(page)

  const picker = page.getByRole('dialog', { name: 'Add furniture' })
  await page.getByRole('button', { name: 'Add Furniture' }).click()
  await expect(picker).toBeVisible()
  await picker.getByText('Leather Couch', { exact: true }).click()
  await picker.getByRole('button', { name: 'Add Item' }).click()

  await waitForToast(page, {
    text: "Couldn't load that item. Check your connection and try again.",
    type: 'error',
  })

  // The toast viewport announces through its own live regions; a second
  // message on either announcer channel would double-speak the failure.
  await expectPoliteAnnouncementUnchanged(page, politeBefore)
  await expectAssertiveAnnouncementUnchanged(page, assertiveBefore)
})

test('invalid ?scene= restore raises an error toast with consequence, channels silent', async ({
  page,
}) => {
  await page.goto('/?scene=!!!garbage!!!')
  await waitForEditorReady(page)

  const toast = await waitForToast(page, {
    text: 'Shared link could not be restored.',
    type: 'error',
  })
  // Title names the outcome; the description states the consequence.
  await expect(toast).toContainText('Starting with an empty room.')

  await expectPoliteAnnouncementUnchanged(page, '')
  await expectAssertiveAnnouncementUnchanged(page, '')
})

test('invalid details field edits keep the error inline and announce assertively, with no toast', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const xInput = page.getByLabel('Distance from left wall (m)')
  await xInput.fill('1.2x')
  await xInput.press('Enter')

  // The panel owns the visible error (aria-invalid + described-by error text);
  // the SR interruption is the global assertive channel.
  await expect(xInput).toHaveAttribute('aria-invalid', 'true')
  await expect
    .poll(async () => readAssertiveAnnouncement(page))
    .toBe('Distance from left wall (m) must be a valid number.')
  await expectNoToasts(page)
})
