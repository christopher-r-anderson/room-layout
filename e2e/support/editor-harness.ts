import { expect, type Page } from '@playwright/test'
import type { PerfCounterSnapshot } from '../../src/shared/debug/perf-counters'

const FURNITURE_ASSET_ROUTE = /\/models\/.+\.glb(?:\?.*)?$/
export const EDITOR_READY_TIMEOUT_MS = 30_000
// The e2e build pins the storage instance segment to `e2e`
// (VITE_STORAGE_INSTANCE in playwright.config.ts).
export const SCENE_DRAFT_STORAGE_KEY = 'room-layout:<e2e>:scene-draft'
// Pointer picking flows through browser input dispatch + R3F/Three render timing.
// On CI this can settle a few frames later than local runs due to external runtime
// variance (headless Chromium scheduling, CPU contention, trace/video overhead), so
// we allow a short retry window to keep selection assertions deterministic.
const POINTER_SELECTION_TIMEOUT_MS = 3_000
const POINTER_SELECTION_ATTEMPTS = 3

export interface BrowserSceneState {
  assetsReady: boolean
  assetError: boolean
  cameraPosition: [number, number, number]
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
  roomSize: { width: number; depth: number; height: number }
  selectedId: string | null
  previewedId: string | null
  selectedName: string | null
  itemCount: number
  restoreOutcome: 'restored' | 'invalid' | 'skipped' | null
  restoreAttemptCount: number
  items: {
    id: string
    catalogId: string
    name: string
    position: [number, number, number]
    rotationY: number
    pointerTarget: {
      x: number
      y: number
    } | null
  }[]
}

interface RoomLayoutTestApi {
  getState: () => BrowserSceneState
  setOverlaysHidden: (hidden: boolean) => void
  getPerfCounters: () => PerfCounterSnapshot
  resetPerfCounters: () => void
}

type RoomLayoutTestWindow = typeof globalThis & {
  __ROOM_LAYOUT_TEST__?: RoomLayoutTestApi
}

async function waitForRoomLayoutTestApi(page: Page) {
  await page.waitForFunction(() => {
    return '__ROOM_LAYOUT_TEST__' in globalThis
  })
}

async function getCanvasBounds(page: Page) {
  const canvasBounds = await page.locator('canvas').boundingBox()

  if (!canvasBounds) {
    throw new Error('canvas bounding box was not available for interaction')
  }

  return canvasBounds
}

async function didSelectFurniture(page: Page, itemId: string) {
  return page
    .waitForFunction(
      (expectedId) => {
        const testWindow = globalThis as RoomLayoutTestWindow

        return (
          testWindow.__ROOM_LAYOUT_TEST__?.getState().selectedId === expectedId
        )
      },
      itemId,
      { timeout: POINTER_SELECTION_TIMEOUT_MS },
    )
    .then(() => true)
    .catch(() => false)
}

export async function readSceneState(page: Page): Promise<BrowserSceneState> {
  await waitForRoomLayoutTestApi(page)

  const rawState = await page.evaluate(() => {
    const testWindow = globalThis as RoomLayoutTestWindow

    return testWindow.__ROOM_LAYOUT_TEST__?.getState() ?? null
  })

  if (!rawState) {
    throw new Error('scene-state test hook did not return any content')
  }

  return rawState
}

async function setOverlaysHidden(page: Page, hidden: boolean) {
  await waitForRoomLayoutTestApi(page)

  await page.evaluate((nextHidden) => {
    const testWindow = globalThis as RoomLayoutTestWindow

    testWindow.__ROOM_LAYOUT_TEST__?.setOverlaysHidden(nextHidden)
  }, hidden)

  await expect(page.locator('main')).toHaveAttribute(
    'data-test-overlays-hidden',
    hidden ? 'true' : 'false',
  )
}

export async function withOverlaysHidden<T>(
  page: Page,
  callback: () => Promise<T>,
): Promise<T> {
  await setOverlaysHidden(page, true)

  try {
    return await callback()
  } finally {
    await setOverlaysHidden(page, false)
  }
}

export async function readPoliteAnnouncement(page: Page) {
  const text = await page
    .locator('[data-announcer-root] [data-announcer-channel="polite"]')
    .textContent()

  return text?.trim() ?? ''
}

export async function readAssertiveAnnouncement(page: Page) {
  const text = await page
    .locator('[data-announcer-root] [data-announcer-channel="assertive"]')
    .textContent()

  return text?.trim() ?? ''
}

export async function waitForPoliteAnnouncement(page: Page, expected: string) {
  await expect.poll(async () => readPoliteAnnouncement(page)).toBe(expected)
}

export async function expectPoliteAnnouncementUnchanged(
  page: Page,
  expected: string,
  options?: {
    durationMs?: number
    intervalMs?: number
  },
) {
  const durationMs = options?.durationMs ?? 600
  const intervalMs = options?.intervalMs ?? 75
  const deadline = Date.now() + durationMs

  while (Date.now() < deadline) {
    expect(await readPoliteAnnouncement(page)).toBe(expected)
    await page.waitForTimeout(intervalMs)
  }
}

export async function expectAssertiveAnnouncementUnchanged(
  page: Page,
  expected: string,
  options?: {
    durationMs?: number
    intervalMs?: number
  },
) {
  const durationMs = options?.durationMs ?? 600
  const intervalMs = options?.intervalMs ?? 75
  const deadline = Date.now() + durationMs

  while (Date.now() < deadline) {
    expect(await readAssertiveAnnouncement(page)).toBe(expected)
    await page.waitForTimeout(intervalMs)
  }
}

export async function waitForEditorReady(page: Page) {
  await expect(page.getByRole('button', { name: 'Add Furniture' })).toBeEnabled(
    { timeout: EDITOR_READY_TIMEOUT_MS },
  )
  await expect(
    page.getByRole('status', { name: /loading the room/i }),
  ).toBeHidden()

  const sceneState = await readSceneState(page)

  expect(sceneState.assetsReady).toBe(true)
  expect(sceneState.assetError).toBe(false)

  return sceneState
}

// Readiness for specs that load a non-English locale: waitForEditorReady keys
// off the English "Add Furniture" button name, so poll the test API's
// readiness flag instead of any rendered text.
export async function waitForEditorReadyAnyLocale(page: Page) {
  await expect
    .poll(async () => (await readSceneState(page)).assetsReady, {
      timeout: EDITOR_READY_TIMEOUT_MS,
    })
    .toBe(true)

  const sceneState = await readSceneState(page)

  expect(sceneState.assetError).toBe(false)

  return sceneState
}

export async function openEditor(page: Page) {
  await page.goto('/')

  return waitForEditorReady(page)
}

// A restore item whose collection is gated on startup, so delaying or failing
// furniture asset requests actually holds/errors the startup loader (an empty
// scene gates on no collections and unlocks before any furniture request).
export const GATED_RESTORE_ITEM = {
  id: 'furniture-instance-1',
  catalogId: 'armchair-1',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
}

// Builds a minimal ?scene= route so startup gates on the referenced collections.
export function makeSceneRoute(items: unknown[]): string {
  const params = new URLSearchParams()
  params.set('scene', JSON.stringify({ v: 1, items }))
  return `/?${params.toString()}`
}

export async function waitForItemCount(page: Page, expectedCount: number) {
  await expect
    .poll(async () => (await readSceneState(page)).itemCount)
    .toBe(expectedCount)

  return readSceneState(page)
}

export async function waitForFirstItemRotationY(
  page: Page,
  expectedRotationY: number,
  precision?: number,
) {
  if (precision === undefined) {
    await expect
      .poll(async () => (await readSceneState(page)).items[0]?.rotationY)
      .toBe(expectedRotationY)
  } else {
    await expect
      .poll(async () => (await readSceneState(page)).items[0]?.rotationY)
      .toBeCloseTo(expectedRotationY, precision)
  }

  return readSceneState(page)
}

export async function waitForFirstItemPosition(
  page: Page,
  expectedPosition: [number, number, number],
) {
  await expect
    .poll(async () => (await readSceneState(page)).items[0]?.position)
    .toEqual(expectedPosition)

  return readSceneState(page)
}

export async function expectSceneFlags(
  page: Page,
  expected: {
    assetsReady: boolean
    assetError: boolean
  },
) {
  const state = await readSceneState(page)

  expect(state).toMatchObject(expected)

  return state
}

export async function focusRoomView(page: Page) {
  const roomView = page.getByRole('region', {
    name: 'Interactive 3D room editor',
  })
  await roomView.focus()
  await expect(roomView).toBeFocused()
}

export async function readPerfCounters(
  page: Page,
): Promise<PerfCounterSnapshot> {
  await waitForRoomLayoutTestApi(page)

  const counters = await page.evaluate(() => {
    const testWindow = globalThis as RoomLayoutTestWindow

    return testWindow.__ROOM_LAYOUT_TEST__?.getPerfCounters() ?? null
  })

  if (!counters) {
    throw new Error('perf-counters test hook did not return any content')
  }

  return counters
}

export async function resetPerfCounters(page: Page) {
  await waitForRoomLayoutTestApi(page)

  await page.evaluate(() => {
    const testWindow = globalThis as RoomLayoutTestWindow
    testWindow.__ROOM_LAYOUT_TEST__?.resetPerfCounters()
  })
}

export async function addFurniture(page: Page, name = 'Leather Couch') {
  const initialState = await readSceneState(page)
  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })

  if (!(await pickerSheet.isVisible())) {
    await pickerTrigger.click()
  }

  await expect(pickerSheet).toBeVisible()

  await pickerSheet.getByText(name, { exact: true }).click()
  await expect(pickerSheet.getByRole('radio', { name })).toBeChecked()
  await pickerSheet.getByRole('button', { name: 'Add Item' }).click()
  await expect(pickerSheet).toBeHidden()

  const nextState = await readSceneState(page)

  expect(nextState.itemCount).toBe(initialState.itemCount + 1)

  return nextState
}

export async function selectOutlinerItemByKeyboard(
  page: Page,
  name: string | RegExp,
) {
  const button = page.getByRole('button', { name })
  await button.focus()
  await expect(button).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-current', 'true')

  return button
}

export async function selectFurnitureById(
  page: Page,
  itemId: string,
  options?: {
    hideOverlays?: boolean
  },
) {
  const run = async () => {
    const canvas = page.locator('canvas')
    let lastSelectedId: string | null = null

    for (let attempt = 1; attempt <= POINTER_SELECTION_ATTEMPTS; attempt += 1) {
      const sceneState = await readSceneState(page)

      if (sceneState.selectedId === itemId) {
        return sceneState
      }

      const item = sceneState.items.find((candidate) => candidate.id === itemId)

      if (!item?.pointerTarget) {
        throw new Error(
          `furniture item ${itemId} does not have a pointer target`,
        )
      }

      const canvasBounds = await getCanvasBounds(page)
      const clickX = Math.min(
        Math.max(item.pointerTarget.x, 1),
        Math.max(canvasBounds.width - 1, 1),
      )
      const clickY = Math.min(
        Math.max(item.pointerTarget.y, 1),
        Math.max(canvasBounds.height - 1, 1),
      )

      await canvas.click({ position: { x: clickX, y: clickY } })

      if (await didSelectFurniture(page, itemId)) {
        return readSceneState(page)
      }

      lastSelectedId = (await readSceneState(page)).selectedId
    }

    throw new Error(
      `click at pointerTarget did not select furniture ${itemId} after ${String(POINTER_SELECTION_ATTEMPTS)} attempts (last selectedId=${lastSelectedId ?? 'null'})`,
    )
  }

  if (options?.hideOverlays) {
    return withOverlaysHidden(page, run)
  }

  return run()
}

export async function rotateSelectionRight(page: Page) {
  await page
    .getByRole('toolbar', { name: 'Selected item actions' })
    .getByRole('button', { name: 'Rotate clockwise' })
    .click()

  return readSceneState(page)
}

export async function updateSelectedItemField(
  page: Page,
  label:
    | 'Distance from left wall (m)'
    | 'Distance from back wall (m)'
    | 'Rotation (deg)',
  value: string,
) {
  const input = page.getByLabel(label)
  await input.fill(value)
  await input.press('Enter')

  return readSceneState(page)
}

export async function dragSelectedFurniture(
  page: Page,
  delta: {
    x: number
    y: number
  },
  startOffset?: {
    x: number
    y: number
  },
  options?: {
    hideOverlays?: boolean
  },
) {
  const run = async () => {
    const sceneState = await readSceneState(page)
    const selectedItem = sceneState.items.find(
      (item) => item.id === sceneState.selectedId,
    )

    if (!selectedItem?.pointerTarget) {
      throw new Error('selected furniture item does not have a pointer target')
    }

    const canvasBounds = await getCanvasBounds(page)

    const startX =
      canvasBounds.x + selectedItem.pointerTarget.x + (startOffset?.x ?? 0)
    const startY =
      canvasBounds.y + selectedItem.pointerTarget.y + (startOffset?.y ?? 0)

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + delta.x, startY + delta.y, { steps: 8 })
    await page.mouse.up()
    await page.mouse.move(1, 1)

    return readSceneState(page)
  }

  if (options?.hideOverlays) {
    return withOverlaysHidden(page, run)
  }

  return run()
}

// A fixed, bounded key hold. Holding a key "until a polled condition is
// observed" makes the resulting magnitude unbounded under parallel load (see
// docs/architecture/testing.md determinism rules); a fixed hold keeps it
// deterministic. Callers assert the durable invariant (camera moved / did not
// move), not an exact magnitude.
export async function holdKey(page: Page, key: string, durationMs = 150) {
  await page.keyboard.down(key)

  try {
    await page.waitForTimeout(durationMs)
  } finally {
    await page.keyboard.up(key)
  }
}

/**
 * With furniture requests blocked, attempts an add from the catalog drawer
 * (opening it if needed) and returns the picker locator. Items from different
 * collections load separately, so each raises its own error toast.
 */
export async function attemptFailingAdd(page: Page, itemName: string) {
  const picker = page.getByRole('dialog', { name: 'Add furniture' })

  if (!(await picker.isVisible())) {
    await page.getByRole('button', { name: 'Add Furniture' }).click()
    await expect(picker).toBeVisible()
  }

  await picker.getByText(itemName, { exact: true }).click()
  await expect(picker.getByRole('radio', { name: itemName })).toBeChecked()
  await picker.getByRole('button', { name: 'Add Item' }).click()

  return picker
}

export async function delayFurnitureAssetRequests(page: Page) {
  let releaseRequests: (() => void) | null = null
  let isReleased = false

  const released = new Promise<void>((resolve) => {
    releaseRequests = () => {
      isReleased = true
      resolve()
    }
  })

  await page.route(FURNITURE_ASSET_ROUTE, async (route) => {
    if (!isReleased) {
      await released
    }

    await route.continue()
  })

  return {
    release() {
      if (!releaseRequests) {
        throw new Error('asset delay release was requested before route setup')
      }

      releaseRequests()
    },
  }
}

export async function failFurnitureAssetRequestsUntilRetry(page: Page) {
  let allowRequests = false

  await page.route(FURNITURE_ASSET_ROUTE, async (route) => {
    if (!allowRequests) {
      await route.abort('failed')
      return
    }

    await route.continue()
  })

  return {
    allowRequests() {
      allowRequests = true
    },
  }
}
