import { expect, type Page } from '@playwright/test'

const FURNITURE_ASSET_ROUTE = /\/models\/leather-collection\.glb(?:\?.*)?$/

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
      { timeout: 750 },
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

export async function waitForEditorReady(page: Page) {
  await expect(page.getByRole('button', { name: 'Add Furniture' })).toBeEnabled(
    { timeout: 30_000 },
  )
  await expect(
    page.getByRole('dialog', { name: /preparing the room editor/i }),
  ).toBeHidden()

  const sceneState = await readSceneState(page)

  expect(sceneState.assetsReady).toBe(true)
  expect(sceneState.assetError).toBe(false)

  return sceneState
}

export async function addFurniture(page: Page, name = 'Leather Couch') {
  const initialState = await readSceneState(page)
  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  const pickerSheet = page.locator('#add-furniture-sheet')

  if (!(await pickerSheet.isVisible())) {
    await pickerTrigger.click()
  }

  await expect(pickerSheet).toBeVisible()

  await pickerSheet.locator('.catalog-card').filter({ hasText: name }).click()
  await pickerSheet.getByRole('button', { name: 'Add Item' }).click()
  await expect(pickerSheet).toBeHidden()

  const nextState = await readSceneState(page)

  expect(nextState.itemCount).toBe(initialState.itemCount + 1)

  return nextState
}

export async function selectFurnitureById(page: Page, itemId: string) {
  const sceneState = await readSceneState(page)
  const item = sceneState.items.find((candidate) => candidate.id === itemId)

  if (!item?.pointerTarget) {
    throw new Error('furniture item does not have a pointer target')
  }

  const canvasBounds = await getCanvasBounds(page)
  const pointerX = canvasBounds.x + item.pointerTarget.x
  const pointerY = canvasBounds.y + item.pointerTarget.y

  const clickOffsets = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 80, y: 0 },
    { x: 120, y: 0 },
    { x: 160, y: 0 },
    { x: 200, y: 0 },
    { x: 240, y: 0 },
    { x: 40, y: -30 },
    { x: 40, y: 30 },
    { x: 120, y: -30 },
    { x: 120, y: 30 },
    { x: 200, y: -30 },
    { x: 200, y: 30 },
    { x: -40, y: 0 },
    { x: 0, y: -30 },
    { x: 0, y: 30 },
  ]

  for (const offset of clickOffsets) {
    const clickX = pointerX + offset.x
    const clickY = pointerY + offset.y

    if (
      clickX < canvasBounds.x ||
      clickX > canvasBounds.x + canvasBounds.width ||
      clickY < canvasBounds.y ||
      clickY > canvasBounds.y + canvasBounds.height
    ) {
      continue
    }

    await page.mouse.click(clickX, clickY)

    if (await didSelectFurniture(page, itemId)) {
      return readSceneState(page)
    }
  }

  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(itemId)

  return readSceneState(page)
}

export async function rotateSelectionRight(page: Page) {
  await page.getByRole('button', { name: 'Rotate Right' }).click()

  return readSceneState(page)
}

export async function removeSelectedFurniture(page: Page) {
  await page.getByRole('button', { name: 'Remove Selected' }).click()
  await page
    .getByRole('dialog', { name: /remove furniture\?/i })
    .getByRole('button', { name: 'Remove' })
    .click()
  await expect(page.getByText('Selected: none')).toBeVisible()

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
  await page.mouse.move(startX + delta.x, startY + delta.y, { steps: 12 })
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
