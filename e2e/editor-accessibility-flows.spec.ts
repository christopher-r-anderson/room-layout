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

  await updateSelectedItemField(
    page,
    'Left/right position (m)',
    (initialPosition[0] + 0.5).toFixed(1),
  )

  const afterCommandMove = await readSceneState(page)
  const commandPosition = afterCommandMove.items[0].position

  expect(commandPosition).not.toEqual(initialPosition)

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
  const helpTrigger = page.locator(
    'button[aria-label="Toggle keyboard shortcuts help"]',
  )
  await helpTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Keyboard Shortcuts' }),
  ).toBeVisible()

  // Escape dismisses and returns focus to the trigger.
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', { name: 'Keyboard Shortcuts' }),
  ).toBeHidden()
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
    await expect(helpTrigger).not.toBeFocused()
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
    name: 'Toggle furniture in room',
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

test('Tab from the room view reaches selected item actions and then details', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  await focusRoomView(page)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Rotate counterclockwise' }),
  ).toBeFocused()

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Left/right position (m)')).toBeFocused()
})

test('outliner keyboard selection keeps focus in the panel and reaches selected item actions with Shift+Tab', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await addFurniture(page, 'End Table')

  const couchButton = page.getByRole('button', { name: /^Leather Couch/i })
  const rotateCounterclockwiseButton = page.getByRole('button', {
    name: 'Rotate counterclockwise',
  })

  await couchButton.focus()
  await page.keyboard.press('Enter')

  await waitForPoliteAnnouncement(
    page,
    'Leather Couch selected. Press Shift+Tab to reach selected item actions and details.',
  )
  await expect(couchButton).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(rotateCounterclockwiseButton).not.toBeFocused()

  let reachedSelectedItemActions = false

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const isFocused = await rotateCounterclockwiseButton.evaluate(
      (node) => node === node.ownerDocument.activeElement,
    )

    if (isFocused) {
      reachedSelectedItemActions = true
      break
    }

    await page.keyboard.press('Shift+Tab')
  }

  expect(reachedSelectedItemActions).toBe(true)
  await expect(rotateCounterclockwiseButton).toBeFocused()
})

test('invalid selected item detail edits show inline feedback and do not move the item', async ({
  page,
}) => {
  await openEditor(page)
  const initialState = await addFurniture(page, 'Leather Couch')
  const initialX = initialState.items[0].position[0]

  const xInput = page.getByLabel('Left/right position (m)')
  await xInput.fill('99')
  await xInput.press('Enter')

  const detailsPanel = page.getByRole('region', {
    name: 'Selected item details',
  })

  await expect(
    detailsPanel.getByText(
      'Left/right position (m) must stay inside the room.',
    ),
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

  const xInput = page.getByLabel('Left/right position (m)')
  const detailsPanel = page.getByRole('region', {
    name: 'Selected item details',
  })

  await xInput.fill('1.2x')
  await xInput.press('Enter')

  await expect(xInput).toHaveValue('1.2x')
  await expect(
    detailsPanel.getByText('Left/right position (m) must be a valid number.'),
  ).toBeVisible()
  await expect
    .poll(async () => readAssertiveAnnouncement(page))
    .toBe('Left/right position (m) must be a valid number.')
})

test('selected item controls are suppressed from tab order while the catalog drawer is open', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const selectedItemControls = page
    .locator('div[inert][aria-hidden="true"]')
    .filter({ hasText: 'Selected item actions' })

  await page.getByRole('button', { name: 'Add Furniture' }).click()
  const drawerDialog = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(drawerDialog).toBeVisible()
  await expect(selectedItemControls).toBeVisible()

  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab')
    await expect(selectedItemControls).toHaveAttribute('inert', '')
  }
})
