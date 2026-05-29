import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  selectFurnitureById,
  waitForItemCount,
} from './support/editor-harness'

async function closeWithEscapeAndRestoreFocus(
  page: Page,
  dialog: Locator,
  focusTarget: Locator,
) {
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(focusTarget).toBeFocused()
}

async function clickVisibleCanvasArea(
  page: Page,
  options?: {
    xRatio?: number
    yOffset?: number
  },
) {
  const canvas = page.locator('canvas')
  const canvasBounds = await canvas.boundingBox()

  if (!canvasBounds) {
    throw new Error('canvas bounding box was not available for interaction')
  }

  await canvas.click({
    position: {
      x: canvasBounds.width * (options?.xRatio ?? 0.35),
      y: options?.yOffset ?? Math.min(canvasBounds.height * 0.3, 160),
    },
  })
}

test('project info dialog preserves repository metadata and returns focus', async ({
  page,
}) => {
  await openEditor(page)

  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })

  await infoButton.click()

  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })
  await expect(infoDialog).toBeVisible()

  await expect(
    infoDialog.getByRole('heading', { name: 'Repository' }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', { name: /christopher anderson/i }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', {
      name: /github.com\/christopher-r-anderson\/room-layout/i,
    }),
  ).toBeVisible()
  await expect(infoDialog.getByRole('link', { name: /^mit/i })).toBeVisible()
  await expect(
    infoDialog.getByRole('heading', { name: 'Wood Floor Texture Set' }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', { name: /^cc0/i }).first(),
  ).toBeVisible()

  await closeWithEscapeAndRestoreFocus(page, infoDialog, infoButton)
})

test('room surface, sheet, and confirmation dialogs keep accessible contracts and return focus', async ({
  page,
}) => {
  await openEditor(page)

  const roomButton = page.locator('button[aria-controls="room-surface"]')
  await roomButton.click()

  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  await expect(roomSurface).toBeVisible()
  await expect(
    roomSurface.getByText(/wall and floor finishes to match your room/i),
  ).toBeVisible()
  await roomSurface.getByRole('button', { name: 'Close room panel' }).focus()
  await closeWithEscapeAndRestoreFocus(page, roomSurface, roomButton)

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  await pickerTrigger.click()

  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()
  await closeWithEscapeAndRestoreFocus(page, pickerSheet, pickerTrigger)

  await addFurniture(page, 'Leather Couch')

  const deleteButton = page.getByRole('button', { name: 'Remove item' })
  await deleteButton.click()

  const deleteDialog = page.getByRole('alertdialog', {
    name: /remove item from room/i,
  })
  await expect(deleteDialog).toBeVisible()
  await expect(
    deleteDialog.getByText(/remove leather couch from your room layout\?/i),
  ).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(deleteButton).toBeFocused()

  const startOverButton = page.getByRole('button', {
    name: 'Start over',
  })
  await startOverButton.click()

  const startOverDialog = page.getByRole('alertdialog', {
    name: /start over\?/i,
  })
  await expect(startOverDialog).toBeVisible()
  await expect(
    startOverDialog.getByText(/restores the default room/i),
  ).toBeVisible()

  await startOverDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(startOverDialog).toBeHidden()
  await expect(startOverButton).toBeFocused()
})

test('desktop Room sidebar closes with Escape and restores focus to its trigger', async ({
  page,
}) => {
  await openEditor(page)

  const roomButton = page.locator('button[aria-controls="room-surface"]')
  await roomButton.focus()
  await expect(roomButton).toBeFocused()

  await page.keyboard.press('Enter')

  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  await expect(roomSurface).toBeVisible()

  await closeWithEscapeAndRestoreFocus(page, roomSurface, roomButton)
})

test('desktop Room sidebar keeps camera presets usable while it remains open', async ({
  page,
}) => {
  await openEditor(page)

  const roomButton = page.locator('button[aria-controls="room-surface"]')
  await roomButton.click()

  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  await expect(roomSurface).toBeVisible()

  const initialCameraPosition = (await readSceneState(page)).cameraPosition

  await page.getByRole('button', { name: 'Switch to Top view' }).click()

  await expect
    .poll(async () => (await readSceneState(page)).cameraPosition)
    .not.toEqual(initialCameraPosition)

  await expect(roomSurface).toBeVisible()
})

test('desktop Room sidebar stays open after canvas background clicks', async ({
  page,
}) => {
  await openEditor(page)

  const roomButton = page.locator('button[aria-controls="room-surface"]')
  await roomButton.click()

  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  await expect(roomSurface).toBeVisible()

  await clickVisibleCanvasArea(page)

  await expect(roomSurface).toBeVisible()
})

test('catalog, room, delete, and info surfaces stay mutually exclusive', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const sceneState = await readSceneState(page)
  const firstItemId = sceneState.items[0]?.id

  if (!firstItemId) {
    throw new Error('expected a furniture item to exist after adding it')
  }

  await selectFurnitureById(page, firstItemId)

  const catalogButton = page.getByRole('button', { name: 'Add Furniture' })
  const roomButton = page.locator('button[aria-controls="room-surface"]')
  const deleteButton = page.getByRole('button', { name: 'Remove item' })
  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })
  const catalogDialog = page.getByRole('dialog', { name: 'Add furniture' })
  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  const deleteDialog = page.getByRole('alertdialog', {
    name: /remove item from room/i,
  })
  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })

  await catalogButton.click()
  await expect(catalogDialog).toBeVisible()

  await page.keyboard.press('Delete')
  await expect(deleteDialog).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(catalogDialog).toBeHidden()

  await roomButton.click()
  await expect(roomSurface).toBeVisible()

  await catalogButton.click()
  await expect(roomSurface).toBeHidden()
  await expect(catalogDialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(catalogDialog).toBeHidden()

  await roomButton.click()
  await expect(roomSurface).toBeVisible()

  await deleteButton.click()
  await expect(roomSurface).toBeHidden()
  await expect(deleteDialog).toBeVisible()

  await expect(infoButton).toBeHidden()
  await expect(infoDialog).toBeHidden()

  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(deleteDialog).toBeHidden()

  await roomButton.click()
  await expect(roomSurface).toBeVisible()

  await infoButton.focus()
  await expect(infoButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(roomSurface).toBeHidden()
  await expect(infoDialog).toBeVisible()

  await closeWithEscapeAndRestoreFocus(page, infoDialog, infoButton)
})

test('confirming desktop start over moves focus to the next enabled header control', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const startOverButton = page.getByRole('button', {
    name: 'Start over',
  })

  await startOverButton.click()

  const startOverDialog = page.getByRole('alertdialog', {
    name: /start over\?/i,
  })
  await expect(startOverDialog).toBeVisible()

  await startOverDialog.getByRole('button', { name: 'Start Over' }).click()

  await expect(startOverDialog).toBeHidden()
  await waitForItemCount(page, 0)
  await expect(startOverButton).toHaveAttribute('aria-disabled', 'true')
  await expect(
    page.getByRole('button', { name: 'Keyboard shortcuts' }),
  ).toBeFocused()
})

test.describe('narrow viewport more actions', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile Room is a direct action and keeps camera presets available while More owns auxiliary dialogs', async ({
    page,
  }) => {
    await openEditor(page)

    const roomButton = page.locator('button[aria-controls="room-drawer"]')
    const moreButton = page.locator('button[aria-label="More actions"]')
    const moreDialog = page.getByRole('dialog', { name: 'More actions' })
    const initialCameraPosition = (await readSceneState(page)).cameraPosition

    await roomButton.click()

    const roomDialog = page.getByRole('dialog', { name: 'Room' })
    await expect(roomDialog).toBeVisible()

    const initialRoomDialogBox = await roomDialog.boundingBox()

    if (!initialRoomDialogBox) {
      throw new Error('expected Room drawer bounding box to be available')
    }

    await roomDialog.getByRole('tab', { name: 'Floor' }).click()
    const floorRoomDialogBox = await roomDialog.boundingBox()

    if (!floorRoomDialogBox) {
      throw new Error('expected Room drawer bounding box after Floor tab')
    }

    expect(
      Math.abs(floorRoomDialogBox.height - initialRoomDialogBox.height),
    ).toBeLessThan(1)

    await roomDialog.getByRole('tab', { name: 'Lighting' }).click()
    const lightingRoomDialogBox = await roomDialog.boundingBox()

    if (!lightingRoomDialogBox) {
      throw new Error('expected Room drawer bounding box after Lighting tab')
    }

    expect(
      Math.abs(lightingRoomDialogBox.height - initialRoomDialogBox.height),
    ).toBeLessThan(1)

    await roomDialog.getByRole('tab', { name: 'Walls' }).click()

    await clickVisibleCanvasArea(page, { xRatio: 0.15, yOffset: 140 })
    await expect(roomDialog).toBeVisible()

    const topViewButton = page.locator(
      '[data-camera-anchor] button[aria-label="Switch to Top view"]',
    )
    await expect(topViewButton).toBeVisible()
    await topViewButton.click()

    await expect
      .poll(async () => (await readSceneState(page)).cameraPosition)
      .not.toEqual(initialCameraPosition)

    await page.keyboard.press('Escape')
    await expect(roomDialog).toBeHidden()
    await expect(roomButton).toBeFocused()

    await roomButton.click()
    await expect(roomDialog).toBeVisible()

    await moreButton.click()
    await expect(roomDialog).toBeHidden()
    await expect(moreDialog).toBeVisible()
    await expect(roomButton).not.toBeFocused()
    await expect(
      moreDialog.getByRole('button', { name: 'Share room layout' }),
    ).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Keyboard shortcuts' }).click()

    const shortcutsDialog = page.getByRole('dialog', {
      name: 'Keyboard Shortcuts',
    })
    await expect(shortcutsDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(shortcutsDialog).toBeHidden()
    await expect(moreButton).toBeFocused()

    await moreButton.click()
    await expect(moreDialog).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Project info' }).click()

    const infoDialog = page.getByRole('dialog', {
      name: /project & asset info/i,
    })
    await expect(infoDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(infoDialog).toBeHidden()
    await expect(moreButton).toBeFocused()

    await roomButton.click()
    await expect(roomDialog).toBeVisible()

    const addFurnitureButton = page
      .locator('button')
      .filter({ hasText: 'Add Furniture' })
      .first()
    await addFurnitureButton.click()

    const addFurnitureDialog = page.getByRole('dialog', {
      name: 'Add furniture',
    })
    await expect(roomDialog).toBeHidden()
    await expect(addFurnitureDialog).toBeVisible()
    await expect(roomButton).not.toBeFocused()

    await page.keyboard.press('Escape')
    await expect(addFurnitureDialog).toBeHidden()
    await expect(addFurnitureButton).toBeFocused()
  })

  test('start over restores focus to a visible control after responsive header resizes', async ({
    page,
  }) => {
    await openEditor(page)
    await addFurniture(page, 'Leather Couch')

    const moreButton = page.getByRole('button', { name: 'More actions' })
    await moreButton.click()

    const moreDialog = page.getByRole('dialog', { name: 'More actions' })
    await expect(moreDialog).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Start Over' }).click()

    const startOverDialog = page.getByRole('alertdialog', {
      name: /start over\?/i,
    })
    await expect(startOverDialog).toBeVisible()

    await page.setViewportSize({ width: 1024, height: 844 })

    const desktopStartOverButton = page.locator(
      '[aria-keyshortcuts="Control+Alt+N Meta+Alt+N"]',
    )
    await expect(desktopStartOverButton).toBeVisible()

    await startOverDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(startOverDialog).toBeHidden()
    await expect(desktopStartOverButton).toBeFocused()

    await desktopStartOverButton.click()
    await expect(startOverDialog).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })

    await startOverDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(startOverDialog).toBeHidden()
    await expect(moreButton).toBeFocused()
  })
})
