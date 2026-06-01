import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'
import type { PerfCounterSnapshot } from '../../src/lib/debug/perf-counters'
import { getPerfBaselineSha } from './perf-meta'

const FURNITURE_ASSET_ROUTE = /\/models\/.+\.glb(?:\?.*)?$/
export const EDITOR_READY_TIMEOUT_MS = 30_000
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

const PERF_RESULTS_DIR = path.resolve(process.cwd(), 'test-results/perf')
const PERF_TRACE_CATEGORIES =
  'disabled-by-default-devtools.timeline,devtools.timeline,v8.execute,blink.user_timing,latencyInfo'

function cameraDistance(
  from: [number, number, number],
  to: [number, number, number],
) {
  const deltaX = to[0] - from[0]
  const deltaY = to[1] - from[1]
  const deltaZ = to[2] - from[2]

  return Math.hypot(deltaX, deltaY, deltaZ)
}

function buildPerfArtifactPath(
  label: string,
  extension: 'trace.json' | 'counters.json',
) {
  return path.join(
    PERF_RESULTS_DIR,
    `${label}-${getPerfBaselineSha()}-${new Date().toISOString()}.${extension}`,
  )
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

export async function setOverlaysHidden(page: Page, hidden: boolean) {
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
    page.getByRole('dialog', { name: /preparing the room editor/i }),
  ).toBeHidden()

  const sceneState = await readSceneState(page)

  expect(sceneState.assetsReady).toBe(true)
  expect(sceneState.assetError).toBe(false)

  return sceneState
}

export async function openEditor(page: Page) {
  await page.goto('/')

  return waitForEditorReady(page)
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

export async function waitForFirstItemX(
  page: Page,
  expectedX: number,
  precision: number,
) {
  await expect
    .poll(async () => (await readSceneState(page)).items[0]?.position[0])
    .toBeCloseTo(expectedX, precision)

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
  await page.getByRole('button', { name: 'Rotate clockwise' }).click()

  return readSceneState(page)
}

export async function deleteSelectedFurniture(page: Page) {
  await page.getByRole('button', { name: 'Remove item' }).click()
  await page
    .getByRole('alertdialog', { name: /remove item from room/i })
    .getByRole('button', { name: 'Remove item' })
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

export async function holdKeyUntilCameraMoves(
  page: Page,
  key: string,
  baseline: [number, number, number],
  minimumDistance = 0.2,
) {
  await page.keyboard.down(key)

  try {
    await expect
      .poll(async () => {
        return cameraDistance(
          (await readSceneState(page)).cameraPosition,
          baseline,
        )
      })
      .toBeGreaterThan(minimumDistance)
  } finally {
    await page.keyboard.up(key)
  }
}

export async function startCdpPerfTrace(page: Page, label: string) {
  const cdp = await page.context().newCDPSession(page)

  await cdp.send('Tracing.start', {
    categories: PERF_TRACE_CATEGORIES,
    transferMode: 'ReturnAsStream',
  })

  return {
    async stop() {
      const tracePath = buildPerfArtifactPath(label, 'trace.json')
      const tracingComplete = new Promise<{ stream: string }>((resolve) => {
        cdp.once('Tracing.tracingComplete', (event) => {
          resolve(event as { stream: string })
        })
      })

      await cdp.send('Tracing.end')
      const { stream } = await tracingComplete

      let traceContent = ''
      let streamEnded = false
      while (!streamEnded) {
        const { data, eof, base64Encoded } = await cdp.send('IO.read', {
          handle: stream,
        })

        traceContent += base64Encoded
          ? Buffer.from(data, 'base64').toString('utf8')
          : data
        streamEnded = eof
      }

      await cdp.send('IO.close', { handle: stream })
      await mkdir(PERF_RESULTS_DIR, { recursive: true })
      await writeFile(tracePath, traceContent, 'utf8')

      const traceStats = await stat(tracePath)
      if (traceStats.size === 0) {
        throw new Error(`CDP trace was empty for ${label}`)
      }

      return tracePath
    },
  }
}

export async function withPerfTrace<T>(
  page: Page,
  label: string,
  callback: () => Promise<T>,
) {
  const trace = await startCdpPerfTrace(page, label)
  let completed = false
  let result!: T
  let error: Error | null = null

  try {
    result = await callback()
    completed = true
  } catch (caughtError) {
    error =
      caughtError instanceof Error
        ? caughtError
        : new Error(String(caughtError))
  }

  const tracePath = await trace.stop()

  if (error) {
    throw error
  }

  if (!completed) {
    throw new Error(`perf trace callback did not complete for ${label}`)
  }

  return {
    result,
    tracePath,
  }
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
