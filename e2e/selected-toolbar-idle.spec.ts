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

// Deterministic perf gate (not a frame-time measurement). Once a selected item
// is on screen and the camera is at rest, no layer should be doing work: the
// floating-toolbar projection's no-op short-circuit must absorb idle frames
// (zero toolbar-geometry store writes), and neither the App nor the Scene should
// re-render. A regression that reintroduces idle churn (a lost memo, unstable
// context/dependency, or an effect that setStates every frame) pushes one of
// these counters above zero. Frame-rate-independent: idle work is structurally
// zero however many frames render.
test('the editor stays quiescent while the camera is idle', async ({
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

  // Measure a window of idle frames: nothing is moving, so no work should happen.
  await resetPerfCounters(page)
  await page.waitForTimeout(300)
  const idle = await readPerfCounters(page)

  expect((await readSceneState(page)).selectedId).not.toBeNull()
  await expect(toolbar).toHaveAttribute(
    'data-selected-toolbar-mode',
    'floating',
  )
  expect(idle.toolbarSinkWrites).toBe(0)
  expect(idle.sceneRenders).toBe(0)
  expect(idle.appRenders).toBe(0)
})
