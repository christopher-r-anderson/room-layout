import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  selectFurnitureById,
  waitForFirstItemRotationY,
  waitForItemCount,
} from './support/editor-harness'

const ROTATION_STEP_RADIANS = Math.PI / 12
const NORMALIZED_RIGHT_ROTATION_RADIANS = Math.PI * 2 - ROTATION_STEP_RADIANS

function cameraDistance(
  from: [number, number, number],
  to: [number, number, number],
) {
  const deltaX = to[0] - from[0]
  const deltaY = to[1] - from[1]
  const deltaZ = to[2] - from[2]

  return Math.hypot(deltaX, deltaY, deltaZ)
}

async function waitForCameraToSettle(
  page: Page,
  options?: {
    intervalMs?: number
    stableSamples?: number
    tolerance?: number
    timeoutMs?: number
  },
) {
  const intervalMs = options?.intervalMs ?? 100
  const stableSamples = options?.stableSamples ?? 3
  const tolerance = options?.tolerance ?? 0.01
  const timeoutMs = options?.timeoutMs ?? 2_000
  const deadline = Date.now() + timeoutMs

  let previousPosition = (await readSceneState(page)).cameraPosition
  let stableCount = 0

  while (Date.now() < deadline) {
    await page.waitForTimeout(intervalMs)

    const nextPosition = (await readSceneState(page)).cameraPosition

    if (cameraDistance(previousPosition, nextPosition) <= tolerance) {
      stableCount += 1
      if (stableCount >= stableSamples) {
        return nextPosition
      }
    } else {
      stableCount = 0
    }

    previousPosition = nextPosition
  }

  return previousPosition
}

async function holdKeyUntilCameraMoves(
  page: Page,
  key: string,
  baseline: [number, number, number],
) {
  await page.keyboard.down(key)

  try {
    await expect
      .poll(async () => (await readSceneState(page)).cameraPosition)
      .not.toEqual(baseline)
  } finally {
    await page.keyboard.up(key)
  }
}

async function holdKeyAndAssertCameraStable(
  page: Page,
  key: string,
  baseline: [number, number, number],
) {
  await page.keyboard.down(key)

  try {
    await expect
      .poll(
        async () =>
          cameraDistance((await readSceneState(page)).cameraPosition, baseline),
        {
          timeout: 500,
        },
      )
      .toBeLessThanOrEqual(0.02)
  } finally {
    await page.keyboard.up(key)
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
  await page.locator('body').press('Control+n')

  const whileInfoOpen = await readSceneState(page)
  expect(whileInfoOpen.items[0].rotationY).toBeCloseTo(initialItem.rotationY, 6)
  await expect(
    page.getByRole('alertdialog', { name: /delete furniture/i }),
  ).toBeHidden()
  await expect(
    page.getByRole('alertdialog', { name: /start over with a new scene/i }),
  ).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(infoDialog).toBeHidden()

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  await pickerTrigger.click()
  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()

  await page.locator('body').press('.')
  await page.locator('body').press('Delete')
  await page.locator('body').press('Control+n')

  const whileSheetOpen = await readSceneState(page)
  expect(whileSheetOpen.items[0].rotationY).toBeCloseTo(
    initialItem.rotationY,
    6,
  )
  await expect(
    page.getByRole('alertdialog', { name: /delete furniture/i }),
  ).toBeHidden()
  await expect(
    page.getByRole('alertdialog', { name: /start over with a new scene/i }),
  ).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(pickerSheet).toBeHidden()

  await page.locator('body').press('.')
  const afterRotate = await waitForFirstItemRotationY(
    page,
    NORMALIZED_RIGHT_ROTATION_RADIANS,
    6,
  )
  expect(afterRotate.selectedName).toBe('Leather Couch')

  await page.locator('body').press('Control+z')
  await waitForFirstItemRotationY(page, initialItem.rotationY)

  const afterUndo = await readSceneState(page)
  expect(afterUndo.itemCount).toBe(1)
  expect(afterUndo.selectedName).toBe('Leather Couch')

  await page.locator('body').press('Control+y')
  await waitForFirstItemRotationY(page, NORMALIZED_RIGHT_ROTATION_RADIANS, 6)

  await page.locator('body').press('Delete')
  const deleteDialog = page.getByRole('alertdialog', {
    name: /delete furniture/i,
  })
  await expect(deleteDialog).toBeVisible()

  await page.locator('body').press('Control+z')
  await waitForFirstItemRotationY(page, NORMALIZED_RIGHT_ROTATION_RADIANS, 6)
  await expect(deleteDialog).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Delete' }).click()
  await waitForItemCount(page, 0)

  await page.locator('body').press('Control+z')
  await waitForItemCount(page, 1)

  const afterRestore = await readSceneState(page)
  expect(afterRestore.items[0].rotationY).toBeCloseTo(
    NORMALIZED_RIGHT_ROTATION_RADIANS,
    6,
  )

  await page.locator('body').press('Control+n')
  const newSceneDialog = page.getByRole('alertdialog', {
    name: /start over with a new scene/i,
  })
  await expect(newSceneDialog).toBeVisible()

  await newSceneDialog.getByRole('button', { name: 'New Scene' }).click()
  const afterNewScene = await waitForItemCount(page, 0)
  expect(afterNewScene.floorFinishId).toBe('wood-floor')
  expect(afterNewScene.wallFinishId).toBe('light-gray')

  await page.locator('body').press('Control+n')
  await expect(
    page.getByRole('alertdialog', { name: /start over with a new scene/i }),
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

  await expect(couchRadio).toBeChecked()

  await page.keyboard.press('Tab')
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

  // Hold W for camera orbit
  await holdKeyUntilCameraMoves(page, 'KeyW', initialCameraPosition)

  const afterMotion = await readSceneState(page)
  expect(afterMotion.itemCount).toBe(initialState.itemCount)
  expect(
    cameraDistance(initialCameraPosition, afterMotion.cameraPosition),
  ).toBeGreaterThan(0.2)
})

test('camera motion with Shift+WASD pans camera', async ({ page }) => {
  await openEditor(page)

  const initialState = await addFurniture(page, 'Leather Couch')
  const initialCameraPosition = initialState.cameraPosition

  // Hold Shift+W key for pan motion
  await page.keyboard.down('Shift')
  await holdKeyUntilCameraMoves(page, 'KeyW', initialCameraPosition)
  await page.keyboard.up('Shift')

  const afterWMotion = await readSceneState(page)
  expect(afterWMotion.itemCount).toBe(1)
  expect(
    cameraDistance(initialCameraPosition, afterWMotion.cameraPosition),
  ).toBeGreaterThan(0.2)
})

test('camera motion with = and - keys zooms camera', async ({ page }) => {
  await openEditor(page)

  const initialState = await addFurniture(page, 'Leather Couch')
  const initialCameraPosition = initialState.cameraPosition

  // Hold = key for zoom in
  await holdKeyUntilCameraMoves(page, 'Equal', initialCameraPosition)

  const afterZoomIn = await readSceneState(page)
  expect(afterZoomIn.itemCount).toBe(1)
  expect(
    cameraDistance(initialCameraPosition, afterZoomIn.cameraPosition),
  ).toBeGreaterThan(0.2)

  const zoomedCameraPosition = afterZoomIn.cameraPosition

  await holdKeyUntilCameraMoves(page, 'Minus', zoomedCameraPosition)
})

test('camera preset shortcuts 1/2/3/4 reposition the camera', async ({
  page,
}) => {
  await openEditor(page)

  const initialState = await readSceneState(page)
  await holdKeyUntilCameraMoves(page, 'KeyW', initialState.cameraPosition)

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
  const initialCameraPosition = await waitForCameraToSettle(page)

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

  await holdKeyAndAssertCameraStable(page, 'KeyW', initialCameraPosition)

  await expect(dialogCloseButton).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(infoDialog).toBeHidden()

  // Test WASD in open editor (should work)
  const afterAdd = await addFurniture(page, 'Leather Couch')
  const cameraPositionAfterDialog = afterAdd.cameraPosition

  // Hold Shift+W for pan
  await page.keyboard.down('Shift')
  await holdKeyUntilCameraMoves(page, 'KeyW', cameraPositionAfterDialog)
  await page.keyboard.up('Shift')

  const afterWMotion = await readSceneState(page)
  expect(afterWMotion.itemCount).toBe(1)
  expect(
    cameraDistance(cameraPositionAfterDialog, afterWMotion.cameraPosition),
  ).toBeGreaterThan(0.2)
})
