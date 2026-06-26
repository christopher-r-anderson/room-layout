import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  expectAssertiveAnnouncementUnchanged,
  expectPoliteAnnouncementUnchanged,
  focusRoomView,
  openEditor,
  readAssertiveAnnouncement,
  readPoliteAnnouncement,
  readSceneState,
  selectOutlinerItemByKeyboard,
  updateSelectedItemField,
  waitForFirstItemPosition,
  waitForItemCount,
  waitForPoliteAnnouncement,
} from './support/editor-harness'

test('applies Arrow, Shift+Arrow, and Alt+Arrow movement steps in no-mouse flow', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)

  const initialState = await readSceneState(page)
  const initialX = initialState.items[0].position[0]

  await focusRoomView(page)
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeCloseTo(initialX + 0.5, 6)

  await page.keyboard.press('Shift+ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeCloseTo(initialX + 1.5, 6)

  await page.keyboard.press('Alt+ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeCloseTo(initialX + 1.6, 6)
})

test('keeps announcements deterministic and reconciles focus on undo selection loss', async ({
  page,
}) => {
  await openEditor(page)
  const addedState = await addFurniture(page, 'Leather Couch')
  const initialPosition = addedState.items[0].position

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)

  await focusRoomView(page)
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => (await readSceneState(page)).items[0]?.position)
    .not.toEqual(initialPosition)
  await page.keyboard.press('Control+z')

  await waitForPoliteAnnouncement(page, 'Undo complete.')

  // Keep checking beyond delayed movement announcement window and assert
  // no stale overwrite occurs.
  await expectPoliteAnnouncementUnchanged(page, 'Undo complete.')

  await waitForFirstItemPosition(page, initialPosition)

  await page.keyboard.press('Control+z')
  await waitForItemCount(page, 0)
  await waitForPoliteAnnouncement(page, 'Undo complete.')
  await expect(
    page.getByRole('region', { name: 'Furniture in room' }),
  ).toBeFocused()
})

test('keeps undo and redo parity across command and drag movement paths', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialPosition = addedState.items[0].position

  await updateSelectedItemField(page, 'Distance from left wall (m)', '1.4')

  const afterCommandMove = await readSceneState(page)
  const commandPosition = afterCommandMove.items[0].position

  expect(commandPosition).not.toEqual(initialPosition)
  expect(commandPosition[0]).toBeCloseTo(-0.5, 6)

  const afterDragMove = await dragSelectedFurniture(
    page,
    {
      x: 150,
      y: 30,
    },
    undefined,
    { hideOverlays: true },
  )
  const dragPosition = afterDragMove.items[0].position

  expect(dragPosition).not.toEqual(commandPosition)

  await page.locator('body').press('Control+z')
  await waitForFirstItemPosition(page, commandPosition)

  await page.locator('body').press('Control+z')
  await waitForFirstItemPosition(page, initialPosition)

  await page.locator('body').press('Control+y')
  await waitForFirstItemPosition(page, commandPosition)

  await page.locator('body').press('Control+y')
  await waitForFirstItemPosition(page, dragPosition)
})

test('outliner keyboard focus preview does not emit live announcements', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await addFurniture(page, 'End Table')

  await expect
    .poll(async () => (await readSceneState(page)).selectedName)
    .toBe('End Table')

  const politeBeforeFocus = await readPoliteAnnouncement(page)
  const assertiveBeforeFocus = await readAssertiveAnnouncement(page)

  // Stabilize on the current polite message before changing focus so that
  // this assertion only covers focus-preview behavior.
  await expectPoliteAnnouncementUnchanged(page, politeBeforeFocus, {
    durationMs: 250,
  })
  await expectAssertiveAnnouncementUnchanged(page, assertiveBeforeFocus, {
    durationMs: 250,
  })

  // Focus an unselected item in the outliner to trigger preview semantics.
  await page.getByRole('button', { name: /^Leather Couch/i }).focus()

  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .not.toBeNull()

  // Check beyond delayed movement announcement window and assert that
  // preview focus changes do not produce accessibility announcements.
  await expectPoliteAnnouncementUnchanged(page, politeBeforeFocus)
  await expectAssertiveAnnouncementUnchanged(page, assertiveBeforeFocus)
})

test('keyboard shortcuts help is reachable and dismissible by keyboard, and is excluded from tab order while the catalog drawer is open', async ({
  page,
}) => {
  await openEditor(page)

  // Reach the trigger via Tab and activate it with Enter.
  const helpTrigger = page.getByRole('button', { name: 'Keyboard shortcuts' })
  const inertHelpTrigger = page.locator(
    'button[aria-label="Keyboard shortcuts"]',
  )
  const shortcutsDialog = page.getByRole('dialog', {
    name: 'Keyboard Shortcuts',
  })
  await helpTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(shortcutsDialog).toBeVisible()

  // Escape dismisses and returns focus to the trigger.
  await page.keyboard.press('Escape')
  await expect(shortcutsDialog).toBeHidden()
  await expect(helpTrigger).toBeFocused()

  // While the catalog drawer is open the help trigger must not be reachable
  // via Tab — its container is made inert so it cannot receive focus.
  await page.getByRole('button', { name: 'Add Furniture' }).click()
  const drawerDialog = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(drawerDialog).toBeVisible()

  // Cycle through every focusable element inside the open drawer; the help
  // trigger must never receive focus.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    await expect(inertHelpTrigger).not.toBeFocused()
  }

  await page.keyboard.press('Escape')
  await expect(drawerDialog).toBeHidden()
})

test('outliner collapse toggle is keyboard operable and manages focus correctly', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const toggleButton = page.getByRole('button', {
    name: 'Toggle furniture list visibility',
  })
  const couchButton = page.getByRole('button', { name: /^Leather Couch/i })

  // Outliner starts expanded — the item list is visible.
  await expect(couchButton).toBeVisible()

  // Focus the toggle and collapse via keyboard.
  await toggleButton.focus()
  await page.keyboard.press('Enter')
  await expect(couchButton).toBeHidden()

  // After collapsing, focus stays on the toggle button (not hidden content).
  await expect(toggleButton).toBeFocused()

  // Re-expand via keyboard; item list reappears.
  await page.keyboard.press('Enter')
  await expect(couchButton).toBeVisible()
})

test('Tab from the room view reaches header controls and Tab from the outliner reaches inspector controls', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  await expect(
    page.getByText('Select an item to fine-tune placement.'),
  ).toBeHidden()

  await focusRoomView(page)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Add Furniture' }),
  ).toBeFocused()

  const outlinerButton = page.getByRole('button', { name: /^Leather Couch/i })
  await outlinerButton.focus()
  await expect(outlinerButton).toBeFocused()

  // In floating mode the actions toolbar is outside the overlay flow, while
  // the details card stays in the overlay traversal after the outliner.
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Distance from left wall (m)')).toBeFocused()
})

test('outliner keyboard selection reaches inspector controls via natural tab order', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const couchButton = page.getByRole('button', { name: /^Leather Couch/i })

  await couchButton.focus()
  await page.keyboard.press('Enter')
  await expect(couchButton).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Distance from left wall (m)')).toBeFocused()
})

test('invalid selected item detail edits show inline feedback and do not move the item', async ({
  page,
}) => {
  await openEditor(page)
  const initialState = await addFurniture(page, 'Leather Couch')
  const initialX = initialState.items[0].position[0]

  const xInput = page.getByLabel('Distance from left wall (m)')
  await xInput.fill('99')
  await xInput.press('Enter')

  const detailsPanel = page.getByRole('region', {
    name: 'Placement',
  })
  const visualSupportMessage = detailsPanel.locator('p[aria-hidden="true"]')

  await expect(
    visualSupportMessage.filter({
      hasText: 'Distance from left wall (m) must stay inside the room.',
    }),
  ).toBeVisible()
  await expect
    .poll(async () => (await readSceneState(page)).items[0]?.position[0])
    .toBeCloseTo(initialX, 6)
})

test('malformed selected item detail edits announce failure and keep the draft visible', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const xInput = page.getByLabel('Distance from left wall (m)')
  const detailsPanel = page.getByRole('region', {
    name: 'Placement',
  })
  const visualSupportMessage = detailsPanel.locator('p[aria-hidden="true"]')
  const localAssertiveAnnouncement = detailsPanel.locator(
    '[aria-live="assertive"]',
  )
  const globalAssertiveBefore = await readAssertiveAnnouncement(page)

  await xInput.fill('1.2x')
  await xInput.press('Enter')

  await expect(xInput).toHaveValue('1.2x')
  await expect(
    visualSupportMessage.filter({
      hasText: 'Distance from left wall (m) must be a valid number.',
    }),
  ).toBeVisible()
  await expect(localAssertiveAnnouncement).toHaveText(
    'Distance from left wall (m) must be a valid number.',
  )
  await expect
    .poll(async () => readAssertiveAnnouncement(page))
    .toBe(globalAssertiveBefore)
})

test('selected item controls are suppressed from tab order while the catalog drawer is open', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const selectedItemActions = page.locator(
    '[data-slot="selected-item-toolbar"]',
  )

  await page.getByRole('button', { name: 'Add Furniture' }).click()
  const drawerDialog = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(drawerDialog).toBeVisible()
  await expect(selectedItemActions).toBeVisible()
  await expect(selectedItemActions).toHaveAttribute('inert', '')

  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab')
    await expect(selectedItemActions).toHaveAttribute('inert', '')
  }
})

test.describe('narrow viewport overlay order', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('keeps Add Furniture early in tab order and restores focus from the Room drawer on mobile', async ({
    page,
  }) => {
    await openEditor(page)

    const roomView = page.getByRole('region', {
      name: 'Interactive 3D room editor',
    })
    const addFurnitureButton = page.getByRole('button', {
      name: 'Add Furniture',
    })
    const roomButton = page.locator('button[aria-controls="room-drawer"]')
    const undoButton = page.getByRole('button', { name: 'Undo' })
    const redoButton = page.getByRole('button', { name: 'Redo' })
    const moreButton = page.getByRole('button', { name: 'More actions' })

    await page.keyboard.press('Tab')
    await expect(roomView).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(addFurnitureButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(roomButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(undoButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(redoButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(moreButton).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    await expect(redoButton).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    await expect(undoButton).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    await expect(roomButton).toBeFocused()

    await page.keyboard.press('Enter')

    const roomDialog = page.getByRole('dialog', { name: 'Room' })
    await expect(roomDialog).toBeVisible()
    await roomDialog.getByRole('tab', { name: 'Walls' }).focus()
    await page.keyboard.press('Escape')
    await expect(roomDialog).toBeHidden()
    await expect(roomButton).toBeFocused()
  })
})
