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
  }[]
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
  await expect(page.getByRole('button', { name: 'Add Item' })).toBeEnabled({
    timeout: 30_000,
  })
  await expect(
    page.getByRole('dialog', { name: /preparing the room editor/i }),
  ).toBeHidden()

  const sceneState = await readSceneState(page)

  expect(sceneState.assetsReady).toBe(true)
  expect(sceneState.assetError).toBe(false)

  return sceneState
}

export async function addFurniture(page: Page, name = 'Leather Couch') {
  await page.getByLabel('Furniture type to add').selectOption({ label: name })
  await page.getByRole('button', { name: 'Add Item' }).click()
  await expect(
    page.getByText(new RegExp(`Selected: ${escapeForRegExp(name)}`)),
  ).toBeVisible()

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
