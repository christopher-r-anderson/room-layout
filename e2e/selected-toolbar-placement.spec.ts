import { expect, test, type Page } from '@playwright/test'
import {
  focusRoomView,
  openEditor,
  readSceneState,
  selectOutlinerItemByKeyboard,
  waitForItemCount,
} from './support/editor-harness'

function boxesIntersect(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  )
}

function boxContainsPoint(
  box: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number },
) {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  )
}

// A short hold keeps the orbit nudge small so the selected item stays on screen
// and the toolbar stays in floating mode. This test does not assert exact
// placement stickiness — keyboard-release latency means the nudge magnitude
// can't be bounded precisely under load — so the hysteresis decision is covered
// in the placement unit tests instead; here we assert the toolbar stays validly
// placed across the camera change.
const NUDGE_HOLD_MS = 150

async function getToolbarBox(page: Page) {
  const toolbar = page.locator('[data-selected-toolbar-mode]')
  await expect(toolbar).toHaveAttribute(
    'data-selected-toolbar-mode',
    'floating',
  )

  const box = await toolbar.boundingBox()
  if (!box) {
    throw new Error('Selected item toolbar bounding box was not available')
  }

  return { toolbar, box }
}

async function getSelectedPointerTargetViewportPoint(page: Page) {
  const state = await readSceneState(page)
  const selectedItem = state.items.find((item) => item.id === state.selectedId)
  if (!selectedItem?.pointerTarget) {
    throw new Error('Selected item pointer target was not available')
  }

  const canvasBox = await page.locator('canvas').boundingBox()
  if (!canvasBox) {
    throw new Error('Canvas bounding box was not available')
  }

  return {
    x: canvasBox.x + selectedItem.pointerTarget.x,
    y: canvasBox.y + selectedItem.pointerTarget.y,
  }
}

test('desktop floating toolbar stays off visible chrome and the pointer target across a camera nudge', async ({
  page,
}) => {
  const initialState = await openEditor(page)

  await page.getByRole('button', { name: 'Add Furniture' }).click()
  const pickerDialog = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerDialog).toBeVisible()
  await pickerDialog.getByText('Leather Couch', { exact: true }).click()
  await expect(
    pickerDialog.getByRole('radio', { name: 'Leather Couch' }),
  ).toBeChecked()
  await pickerDialog.getByRole('button', { name: 'Add Item' }).click()
  await expect(pickerDialog).toBeHidden()

  const addedState = await waitForItemCount(page, initialState.itemCount + 1)
  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(addedState.items[0]?.id ?? null)

  const headerBox = await page.locator('[data-top-header-root]').boundingBox()
  if (!headerBox) {
    throw new Error('Top header bounding box was not available')
  }

  const { box: initialToolbarBox } = await getToolbarBox(page)
  const initialPointerPoint = await getSelectedPointerTargetViewportPoint(page)

  expect(boxesIntersect(initialToolbarBox, headerBox)).toBe(false)
  expect(boxContainsPoint(initialToolbarBox, initialPointerPoint)).toBe(false)

  await focusRoomView(page)
  const preNudgeCameraPosition = (await readSceneState(page)).cameraPosition

  // The camera only rotates while the key is held and stops on release (no
  // momentum), so the position is stable to read immediately afterwards.
  await page.keyboard.down('KeyW')
  try {
    await page.waitForTimeout(NUDGE_HOLD_MS)
  } finally {
    await page.keyboard.up('KeyW')
  }

  // The nudge must have actually moved the camera, or the test proves nothing.
  expect((await readSceneState(page)).cameraPosition).not.toEqual(
    preNudgeCameraPosition,
  )

  // getToolbarBox also asserts the toolbar is still in floating mode. The toolbar
  // must remain clear of the header and never sit on top of the pointer target.
  const { box: nudgedToolbarBox } = await getToolbarBox(page)
  const nudgedPointerPoint = await getSelectedPointerTargetViewportPoint(page)

  expect(boxesIntersect(nudgedToolbarBox, headerBox)).toBe(false)
  expect(boxContainsPoint(nudgedToolbarBox, nudgedPointerPoint)).toBe(false)
})
