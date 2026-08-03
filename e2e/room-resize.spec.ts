import { test, expect, type Page } from '@playwright/test'
import {
  makeSceneRoute,
  openEditor,
  readSceneState,
  waitForEditorReady,
  SCENE_DRAFT_STORAGE_KEY,
} from './support/editor-harness'
import { waitForToast } from './support/toasts'

// Room resizing via the Room surface's Size tab: commit/persistence, the
// never-move-on-shrink policy with its warning, and the move-inside fix.

async function openSizeTab(page: Page) {
  const roomSurface = page.getByRole('complementary', { name: 'Room' })

  if (!(await roomSurface.isVisible())) {
    await page.locator('button[aria-controls="room-surface"]').click()
    await expect(roomSurface).toBeVisible()
  }

  // The rightmost tab can sit under the camera-tools overlay; keyboard
  // activation bypasses the pointer overlap.
  const sizeTab = roomSurface.getByRole('tab', { name: 'Size' })
  await sizeTab.focus()
  await sizeTab.press('Enter')
  await expect(
    roomSurface.getByRole('tabpanel', { name: 'Size' }),
  ).toBeVisible()

  return roomSurface
}

async function commitField(page: Page, label: string, value: string) {
  const input = page.getByLabel(label)
  await input.fill(value)
  await input.press('Enter')
}

test('commits typed dimensions and persists them across a reload', async ({
  page,
}) => {
  await openEditor(page)
  await openSizeTab(page)

  await commitField(page, 'Width (m)', '8')
  await commitField(page, 'Depth (m)', '10')
  await commitField(page, 'Wall height (m)', '3')

  await expect
    .poll(async () => (await readSceneState(page)).roomSize)
    .toEqual({ width: 8, depth: 10, height: 3 })

  // Draft autosave picks the size up, so a plain reload keeps it.
  await expect
    .poll(async () =>
      page.evaluate(
        (key) =>
          (
            JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
              roomSize?: unknown
            }
          ).roomSize,
        SCENE_DRAFT_STORAGE_KEY,
      ),
    )
    .toEqual({ width: 8, depth: 10, height: 3 })

  await page.reload()
  const reloaded = await waitForEditorReady(page)

  expect(reloaded.roomSize).toEqual({ width: 8, depth: 10, height: 3 })
})

test('rejects an out-of-range dimension with a visible field error', async ({
  page,
}) => {
  await openEditor(page)
  await openSizeTab(page)

  await commitField(page, 'Width (m)', '25')

  // Scoped to the tab panel: the SR announcer mirrors the same text.
  await expect(
    page
      .getByRole('tabpanel', { name: 'Size' })
      .getByText('Width (m) must be between 2 and 20.'),
  ).toBeVisible()
  expect((await readSceneState(page)).roomSize.width).toBe(6)
})

test('shrinking never moves furniture; the fix action pulls it inside undoably', async ({
  page,
}) => {
  // The armchair (1.15m footprint) at x=1.5 fits the default room but not a
  // 4m-wide one.
  await page.goto(
    makeSceneRoute([
      {
        id: 'furniture-instance-1',
        catalogId: 'armchair-1',
        position: [1.5, 0, 0],
        rotationY: 0,
      },
    ]),
  )
  await waitForEditorReady(page)
  await openSizeTab(page)

  await commitField(page, 'Width (m)', '4')

  // The item keeps its position; the warning explains.
  await waitForToast(page, {
    text: '1 item is outside the room walls.',
    type: 'warning',
  })
  expect((await readSceneState(page)).items[0].position).toEqual([1.5, 0, 0])

  const fixButton = page.getByRole('button', { name: 'Move items inside' })
  await fixButton.click()

  await waitForToast(page, {
    text: 'Moved 1 item inside the room.',
    type: 'success',
  })
  await expect
    .poll(async () => (await readSceneState(page)).items[0].position[0])
    .toBeLessThan(1.5)
  await expect(fixButton).toBeHidden()

  await page.getByRole('button', { name: 'Undo' }).click()

  await expect
    .poll(async () => (await readSceneState(page)).items[0].position)
    .toEqual([1.5, 0, 0])
  await expect(
    page.getByRole('button', { name: 'Move items inside' }),
  ).toBeVisible()
})
