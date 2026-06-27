import { expect, test } from '@playwright/test'
import {
  addFurniture,
  focusRoomView,
  holdKey,
  openEditor,
  readPerfCounters,
  readSceneState,
  resetPerfCounters,
  selectOutlinerItemByKeyboard,
} from './support/editor-harness'

// Deterministic perf gate (not a frame-time measurement). The floating-toolbar
// projection runs as the camera moves, but once everything is at rest it must
// not keep writing to the toolbar-geometry store — the no-op short-circuit
// (toolbar-geometry-store) should absorb idle frames. A regression that
// reintroduces per-frame churn (a lost memo, unstable dependency, or render
// loop) flips idle store writes above zero. This is frame-rate-independent:
// "writes while nothing moves" is structurally zero however many frames render.
test('floating toolbar does not churn its store while the camera is idle', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  const toolbar = page.locator('section[aria-label="Selected item actions"]')
  await expect(toolbar).toHaveAttribute(
    'data-selected-toolbar-mode',
    'floating',
  )

  // Nudge the camera, then let it (and the toolbar placement) fully settle.
  await focusRoomView(page)
  await holdKey(page, 'KeyW')
  await page.waitForTimeout(500)

  // Measure a window of idle frames: nothing is moving, so the toolbar must not
  // write to its store.
  await resetPerfCounters(page)
  await page.waitForTimeout(300)
  const idle = await readPerfCounters(page)

  expect((await readSceneState(page)).selectedId).not.toBeNull()
  await expect(toolbar).toHaveAttribute(
    'data-selected-toolbar-mode',
    'floating',
  )
  expect(idle.toolbarSinkWrites).toBe(0)
})
