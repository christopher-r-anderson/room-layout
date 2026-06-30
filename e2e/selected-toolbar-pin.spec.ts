import { expect, test, type Page } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  selectOutlinerItemByKeyboard,
} from './support/editor-harness'

async function getFloatingToolbarBox(page: Page) {
  const toolbar = page.locator('section[aria-label="Selected item actions"]')
  await expect(toolbar).toHaveAttribute(
    'data-selected-toolbar-mode',
    'floating',
  )

  const box = await toolbar.boundingBox()
  if (!box) {
    throw new Error('Selected item toolbar bounding box was not available')
  }

  return box
}

// While the toolbar is engaged, its position pins so repeated rotate presses
// don't walk it out from under a stationary cursor. This reproduces the user
// scenario directly: park the pointer on one viewport point over the rotate
// button and click that same point repeatedly. If the toolbar chased the
// rotating object's projected geometry, the button would slide away and later
// clicks would miss it (rotation would stop advancing).
test('floating toolbar stays under the cursor across repeated rotate clicks', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .not.toBeNull()

  const rotateButton = page
    .getByRole('toolbar', { name: 'Selected item actions' })
    .getByRole('button', { name: 'Rotate clockwise' })
  const buttonBox = await rotateButton.boundingBox()
  if (!buttonBox) {
    throw new Error('Rotate button bounding box was not available')
  }

  const target = {
    x: buttonBox.x + buttonBox.width / 2,
    y: buttonBox.y + buttonBox.height / 2,
  }

  // Park the cursor over the button (engaging the pin), then capture the pinned
  // baseline position.
  await page.mouse.move(target.x, target.y)
  const baselineBox = await getFloatingToolbarBox(page)

  let previousRotationY = (await readSceneState(page)).items[0]?.rotationY ?? 0

  for (let click = 0; click < 3; click += 1) {
    await page.mouse.click(target.x, target.y)

    // A landed click advances the rotation; a missed click (toolbar slid away)
    // would leave it unchanged and time this poll out.
    await expect
      .poll(async () => (await readSceneState(page)).items[0]?.rotationY)
      .not.toBe(previousRotationY)
    previousRotationY = (await readSceneState(page)).items[0]?.rotationY ?? 0

    // Pause within the pin grace window; the toolbar must not have moved.
    await page.waitForTimeout(250)
    const box = await getFloatingToolbarBox(page)
    expect(Math.abs(box.x - baselineBox.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.y - baselineBox.y)).toBeLessThanOrEqual(1)
  }
})
