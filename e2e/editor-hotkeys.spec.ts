import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addFurniture,
  focusRoomView,
  holdKey,
  openEditor,
  readSceneState,
  selectFurnitureById,
  selectOutlinerItemByKeyboard,
  waitForFirstItemRotationY,
  waitForItemCount,
  waitForPoliteAnnouncement,
} from './support/editor-harness'

function cameraDistance(
  from: [number, number, number],
  to: [number, number, number],
) {
  const deltaX = to[0] - from[0]
  const deltaY = to[1] - from[1]
  const deltaZ = to[2] - from[2]

  return Math.hypot(deltaX, deltaY, deltaZ)
}

async function holdKeyAndAssertCameraStable(page: Page, key: string) {
  // Baseline is captured immediately before the key goes down so the
  // assertion measures only key-driven movement, not prior camera drift.
  const baseline = (await readSceneState(page)).cameraPosition

  await page.keyboard.down(key)

  const SAMPLE_INTERVAL_MS = 100
  const SAMPLE_COUNT = 10
  const MAX_ALLOWED_DISTANCE = 0.02
  const samples: { ms: number; dist: number; pos: [number, number, number] }[] =
    []

  try {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      await page.waitForTimeout(SAMPLE_INTERVAL_MS)
      const s = await readSceneState(page)
      samples.push({
        ms: (i + 1) * SAMPLE_INTERVAL_MS,
        dist: cameraDistance(baseline, s.cameraPosition),
        pos: s.cameraPosition,
      })
    }
  } finally {
    await page.keyboard.up(key)
  }

  const maxDist = Math.max(...samples.map((s) => s.dist))
  if (maxDist > MAX_ALLOWED_DISTANCE) {
    const fmt = (s: (typeof samples)[0]) =>
      `  t=${String(s.ms).padStart(4)}ms  dist=${s.dist.toFixed(4)}  pos=[${s.pos.map((v) => v.toFixed(3)).join(', ')}]`
    const base = `[${baseline.map((v) => v.toFixed(3)).join(', ')}]`
    throw new Error(
      `Camera moved (max dist ${maxDist.toFixed(4)} > ${MAX_ALLOWED_DISTANCE.toFixed(2)}) when '${key}' held — modal suppression should prevent this.\n` +
        `Baseline: ${base}\n${samples.map(fmt).join('\n')}`,
    )
  }
}

async function pressKeyAndWaitForCameraMove(
  page: Page,
  key: string,
  baseline: [number, number, number],
) {
  await page.keyboard.press(key)
  await expect
    .poll(async () => (await readSceneState(page)).cameraPosition)
    .not.toEqual(baseline)

  return readSceneState(page)
}

async function tabTo(page: Page, target: Locator, maxTabs = 30) {
  for (let index = 0; index < maxTabs; index += 1) {
    try {
      await expect(target).toBeFocused({ timeout: 50 })
      return
    } catch {
      // Keep tabbing until the requested control receives focus.
    }

    await page.keyboard.press('Tab')
  }

  await expect(target).toBeFocused()
}

test('applies keyboard shortcuts for rotate, history, and delete confirmation', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialItem = addedState.items[0]

  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })
  await infoButton.click()
  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })
  await expect(infoDialog).toBeVisible()

  await page.locator('body').press('.')
  await page.locator('body').press('Control+z')
  await page.locator('body').press('Delete')
  await page.locator('body').press('Control+Alt+n')

  const whileInfoOpen = await readSceneState(page)
  expect(whileInfoOpen.items[0].rotationY).toBeCloseTo(initialItem.rotationY, 6)
  await expect(
    page.getByRole('alertdialog', { name: /remove item from room/i }),
  ).toBeHidden()
  await expect(
    page.getByRole('alertdialog', { name: /start over\?/i }),
  ).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(infoDialog).toBeHidden()

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  await pickerTrigger.click()
  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()

  await page.locator('body').press('.')
  await page.locator('body').press('Delete')
  await page.locator('body').press('Control+Alt+n')

  const whileSheetOpen = await readSceneState(page)
  expect(whileSheetOpen.items[0].rotationY).toBeCloseTo(
    initialItem.rotationY,
    6,
  )
  await expect(
    page.getByRole('alertdialog', { name: /remove item from room/i }),
  ).toBeHidden()
  await expect(
    page.getByRole('alertdialog', { name: /start over\?/i }),
  ).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(pickerSheet).toBeHidden()

  await focusRoomView(page)
  await page.keyboard.press('.')
  // Rotate one step. The exact normalized angle is owned by the rotation unit
  // tests; capture the resulting value to drive the undo/redo parity below.
  await expect
    .poll(async () => (await readSceneState(page)).items[0].rotationY)
    .not.toBeCloseTo(initialItem.rotationY, 6)
  const afterRotate = await readSceneState(page)
  const rotatedRotationY = afterRotate.items[0].rotationY
  expect(afterRotate.selectedName).toBe('Leather Couch')

  await page.keyboard.press('Control+z')
  await waitForFirstItemRotationY(page, initialItem.rotationY)

  const afterUndo = await readSceneState(page)
  expect(afterUndo.itemCount).toBe(1)
  expect(afterUndo.selectedName).toBe('Leather Couch')

  await page.keyboard.press('Control+y')
  await waitForFirstItemRotationY(page, rotatedRotationY, 6)

  await page.keyboard.press('Delete')
  const deleteDialog = page.getByRole('alertdialog', {
    name: /remove item from room/i,
  })
  await expect(deleteDialog).toBeVisible()

  await page.keyboard.press('Control+z')
  await waitForFirstItemRotationY(page, rotatedRotationY, 6)
  await expect(deleteDialog).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Remove item' }).click()
  await waitForItemCount(page, 0)

  await page.keyboard.press('Control+z')
  await waitForItemCount(page, 1)

  const afterRestore = await readSceneState(page)
  expect(afterRestore.items[0].rotationY).toBeCloseTo(rotatedRotationY, 6)

  await page.keyboard.press('Control+Alt+n')
  const startOverDialog = page.getByRole('alertdialog', {
    name: /start over\?/i,
  })
  await expect(startOverDialog).toBeVisible()

  await startOverDialog.getByRole('button', { name: 'Start Over' }).click()
  const afterStartOver = await waitForItemCount(page, 0)
  expect(afterStartOver.floorFinishId).toBe('wood-floor')
  expect(afterStartOver.wallFinishId).toBe('light-gray')

  await page.keyboard.press('Control+Alt+n')
  await expect(
    page.getByRole('alertdialog', { name: /start over\?/i }),
  ).toBeHidden()
})

test('supports keyboard-driven furniture picker flow', async ({ page }) => {
  await openEditor(page)

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })

  await tabTo(page, pickerTrigger)

  await page.keyboard.press('Enter')

  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()

  const couchRadio = page.locator(
    'input[name="furniture-catalog"][value="couch-1"]',
  )
  const armchairRadio = page.locator(
    'input[name="furniture-catalog"][value="armchair-1"]',
  )
  const couchRadioControl = page.getByRole('radio', { name: 'Leather Couch' })

  await expect(couchRadio).toBeChecked()

  await couchRadioControl.focus()
  await page.keyboard.press('ArrowDown')
  await expect(armchairRadio).toBeChecked()

  const addButton = page.getByRole('button', { name: 'Add Item' })
  await page.keyboard.press('Tab')
  await expect(addButton).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(pickerSheet).toBeHidden()

  await waitForItemCount(page, 1)

  const addedState = await readSceneState(page)
  expect(addedState.selectedName).toBe('Leather Armchair')

  await expect(pickerTrigger).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(pickerSheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(pickerSheet).toBeHidden()
  await expect(pickerTrigger).toBeFocused()
})

test('camera motion with WASD orbits when no selection', async ({ page }) => {
  await openEditor(page)

  const initialState = await readSceneState(page)
  expect(initialState.itemCount).toBe(0)
  const initialCameraPosition = initialState.cameraPosition

  await focusRoomView(page)
  // Hold W for camera orbit
  await holdKey(page, 'KeyW')

  const afterMotion = await readSceneState(page)
  expect(afterMotion.itemCount).toBe(initialState.itemCount)
  expect(afterMotion.cameraPosition).not.toEqual(initialCameraPosition)
})

test('camera motion with Shift+WASD pans camera', async ({ page }) => {
  await openEditor(page)

  const initialState = await addFurniture(page, 'Leather Couch')
  const initialCameraPosition = initialState.cameraPosition

  await focusRoomView(page)
  // Hold Shift+W key for pan motion
  await page.keyboard.down('Shift')
  await holdKey(page, 'KeyW')
  await page.keyboard.up('Shift')

  const afterWMotion = await readSceneState(page)
  expect(afterWMotion.itemCount).toBe(1)
  expect(afterWMotion.cameraPosition).not.toEqual(initialCameraPosition)
})

test('camera motion with = and - keys zooms camera', async ({ page }) => {
  await openEditor(page)

  const initialState = await addFurniture(page, 'Leather Couch')
  const initialCameraPosition = initialState.cameraPosition

  await focusRoomView(page)
  // Hold = key for zoom in
  await holdKey(page, 'Equal')

  const afterZoomIn = await readSceneState(page)
  expect(afterZoomIn.itemCount).toBe(1)
  expect(afterZoomIn.cameraPosition).not.toEqual(initialCameraPosition)

  const zoomedCameraPosition = afterZoomIn.cameraPosition

  // Zoom back out; the camera must move again.
  await holdKey(page, 'Minus')
  expect((await readSceneState(page)).cameraPosition).not.toEqual(
    zoomedCameraPosition,
  )
})

test('camera preset shortcuts 1/2/3/4 reposition the camera', async ({
  page,
}) => {
  await openEditor(page)
  await focusRoomView(page)

  // Nudge the camera off its initial pose so the preset reposition is observable.
  await holdKey(page, 'KeyW')

  const afterPresetCorner = await pressKeyAndWaitForCameraMove(
    page,
    '1',
    (await readSceneState(page)).cameraPosition,
  )

  const afterPresetFront = await pressKeyAndWaitForCameraMove(
    page,
    '2',
    afterPresetCorner.cameraPosition,
  )

  const afterPresetSide = await pressKeyAndWaitForCameraMove(
    page,
    '3',
    afterPresetFront.cameraPosition,
  )

  const afterPresetTop = await pressKeyAndWaitForCameraMove(
    page,
    '4',
    afterPresetSide.cameraPosition,
  )

  expect(afterPresetTop.cameraPosition).not.toEqual(
    afterPresetSide.cameraPosition,
  )
})

test('focus-selected (F) reframes the camera on the selected item', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)

  await focusRoomView(page)

  // Move the camera off any framing pose, then focus the selection: the camera
  // must reframe. The exact framing math is owned by the camera unit tests; here
  // we verify the real key -> command -> camera reposition chain end to end.
  await holdKey(page, 'KeyW')
  const afterFocus = await pressKeyAndWaitForCameraMove(
    page,
    'f',
    (await readSceneState(page)).cameraPosition,
  )
  expect(afterFocus.selectedName).toBe('Leather Couch')
})

test('arrow keys move selected object and do not move the camera', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const furnitureId = addedState.items[0].id
  const initialPosition = addedState.items[0].position
  const initialCameraPosition = addedState.cameraPosition

  // Select the furniture using canvas interaction
  await selectFurnitureById(page, furnitureId)
  // Ensure room view has focus before pressing arrow keys
  await focusRoomView(page)

  // Move the furniture left using arrow keys
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowLeft')
  }

  const afterMove = await readSceneState(page)
  // Furniture should have moved (position x should be less than initial)
  expect(afterMove.items[0].position[0]).toBeLessThan(initialPosition[0])
  // Camera should remain stable while arrows are used for object movement
  expect(afterMove.cameraPosition).toEqual(initialCameraPosition)
})

test('WASD is suppressed in modal dialogs but enabled in the editor', async ({
  page,
}) => {
  await openEditor(page)

  // Try WASD in a dialog text input (should pass through)
  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })
  await infoButton.click()

  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })
  await expect(infoDialog).toBeVisible()
  const dialogCloseButton = infoDialog
    .getByRole('button', { name: 'Close' })
    .first()
  await expect(dialogCloseButton).toBeVisible()
  await dialogCloseButton.focus()
  await expect(dialogCloseButton).toBeFocused()

  await holdKeyAndAssertCameraStable(page, 'KeyW')

  await expect(dialogCloseButton).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(infoDialog).toBeHidden()

  // Test WASD in open editor (should work)
  const afterAdd = await addFurniture(page, 'Leather Couch')
  const cameraPositionAfterDialog = afterAdd.cameraPosition

  await focusRoomView(page)
  // Hold Shift+W for pan
  await page.keyboard.down('Shift')
  await holdKey(page, 'KeyW')
  await page.keyboard.up('Shift')

  const afterWMotion = await readSceneState(page)
  expect(afterWMotion.itemCount).toBe(1)
  expect(afterWMotion.cameraPosition).not.toEqual(cameraPositionAfterDialog)
})

test('WASD camera controls stay enabled while the desktop Room sidebar is open', async ({
  page,
}) => {
  await openEditor(page)

  const roomButton = page.locator('button[aria-controls="room-surface"]')
  await roomButton.click()

  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  await expect(roomSurface).toBeVisible()

  const initialCameraPosition = (await readSceneState(page)).cameraPosition

  await focusRoomView(page)
  await page.keyboard.down('Shift')

  try {
    await holdKey(page, 'KeyW')
  } finally {
    await page.keyboard.up('Shift')
  }

  // WASD stays live under the non-blocking sidebar: the camera moved and the
  // sidebar is still open.
  expect((await readSceneState(page)).cameraPosition).not.toEqual(
    initialCameraPosition,
  )
  await expect(roomSurface).toBeVisible()
})

test('canvas browse: arrow keys cycle preview when nothing is selected, Enter selects previewed item', async ({
  page,
}) => {
  await openEditor(page)

  // Add two items so there is something to browse through
  await addFurniture(page, 'Leather Couch')
  const state2 = await addFurniture(page, 'End Table')
  expect(state2.itemCount).toBe(2)

  const itemIds = state2.items.map((i) => i.id)

  // Deselect so canvas browse mode is active (ArrowRight browses, not moves)
  await focusRoomView(page)
  await page.keyboard.press('Escape')

  const deselectedState = await readSceneState(page)
  expect(deselectedState.selectedId).toBeNull()

  // Nothing selected, room view focused — ArrowRight should preview the first item
  await page.keyboard.press('ArrowRight')

  const afterFirstRight = await readSceneState(page)
  expect(afterFirstRight.selectedId).toBeNull()
  expect(afterFirstRight.previewedId).not.toBeNull()
  const firstPreviewId = afterFirstRight.previewedId

  // A second ArrowRight should advance to the next item (or wrap)
  await page.keyboard.press('ArrowRight')
  const afterSecondRight = await readSceneState(page)
  expect(afterSecondRight.selectedId).toBeNull()
  expect(afterSecondRight.previewedId).not.toBeNull()
  // The preview should have cycled to a valid item
  const secondPreviewId = afterSecondRight.previewedId
  expect(itemIds).toContain(firstPreviewId)
  expect(itemIds).toContain(secondPreviewId)

  // Home should go to the first item in spatial order
  await page.keyboard.press('Home')
  const afterHome = await readSceneState(page)
  expect(afterHome.selectedId).toBeNull()
  expect(afterHome.previewedId).not.toBeNull()

  // Enter should select the currently previewed item
  await page.keyboard.press('Enter')
  const afterEnter = await readSceneState(page)
  expect(afterEnter.selectedId).toBe(afterHome.previewedId)
  expect(afterEnter.previewedId).toBeNull()
})

test('canvas browse: announces item name and then selection with the selected item controls hint', async ({
  page,
}) => {
  await openEditor(page)
  const state = await addFurniture(page, 'Leather Couch')
  expect(state.itemCount).toBe(1)

  // Deselect so canvas browse mode is active (ArrowRight browses, not moves)
  await focusRoomView(page)
  await page.keyboard.press('Escape')

  // First ArrowRight should preview the item and announce its name
  await page.keyboard.press('ArrowRight')
  const itemName = state.items[0].name
  await waitForPoliteAnnouncement(page, itemName)

  // Enter should select and announce with the jump-to-actions hint
  await page.keyboard.press('Enter')
  await waitForPoliteAnnouncement(
    page,
    `${itemName} selected. Press Shift+T to reach its actions.`,
  )

  const afterSelect = await readSceneState(page)
  expect(afterSelect.selectedId).toBe(state.items[0].id)
})
