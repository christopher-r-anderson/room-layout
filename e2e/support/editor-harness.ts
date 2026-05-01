import { expect, type Page } from '@playwright/test'

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
  selectedId: string | null
  selectedName: string | null
  itemCount: number
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
        const testWindow = globalThis as typeof globalThis & {
          __ROOM_LAYOUT_TEST__?: { getState: () => BrowserSceneState }
        }

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
  await page.waitForFunction(() => {
    return '__ROOM_LAYOUT_TEST__' in globalThis
  })

  const rawState = await page.evaluate(() => {
    const testWindow = globalThis as typeof globalThis & {
      __ROOM_LAYOUT_TEST__?: { getState: () => BrowserSceneState }
    }

    return testWindow.__ROOM_LAYOUT_TEST__?.getState() ?? null
  })

  if (!rawState) {
    throw new Error('scene-state test hook did not return any content')
  }

  return rawState
}

export async function readPoliteAnnouncement(page: Page) {
  const text = await page.locator('[aria-live="polite"]').textContent()

  return text?.trim() ?? ''
}

export async function readAssertiveAnnouncement(page: Page) {
  const text = await page.locator('[aria-live="assertive"]').textContent()

  return text?.trim() ?? ''
}

export async function waitForPoliteAnnouncement(page: Page, expected: string) {
  await expect.poll(async () => readPoliteAnnouncement(page)).toBe(expected)
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

export async function selectFurnitureById(page: Page, itemId: string) {
  const canvas = page.locator('canvas')
  let lastSelectedId: string | null = null

  for (let attempt = 1; attempt <= POINTER_SELECTION_ATTEMPTS; attempt += 1) {
    const sceneState = await readSceneState(page)

    if (sceneState.selectedId === itemId) {
      return sceneState
    }

    const item = sceneState.items.find((candidate) => candidate.id === itemId)

    if (!item?.pointerTarget) {
      throw new Error(`furniture item ${itemId} does not have a pointer target`)
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

export async function rotateSelectionRight(page: Page) {
  await page.getByRole('button', { name: 'Rotate Right' }).click()

  return readSceneState(page)
}

export async function deleteSelectedFurniture(page: Page) {
  await page.getByRole('button', { name: 'Delete' }).click()
  await page
    .getByRole('alertdialog', { name: /delete furniture/i })
    .getByRole('button', { name: 'Delete' })
    .click()

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
) {
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

  return readSceneState(page)
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
