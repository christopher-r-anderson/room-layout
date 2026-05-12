/**
 * Browser tests for the URL scene restore and copy-URL features.
 *
 * Covers:
 *  - Successful restore from a valid `?scene=` param
 *  - Invalid payload shows error message and leaves scene empty
 *  - One-shot guard: restore only fires once across asset retry
 *  - Copy Scene URL button writes to clipboard and announces success
 *  - Selection is cleared after restore
 *  - Full round-trip: copy URL in app → navigate to it → scene restored
 */
import { expect, test, type Page } from '@playwright/test'
import type { FurnitureInstance } from '../src/scene/objects/furniture.types'
import {
  addFurniture,
  openEditor,
  readSceneState,
  waitForEditorReady,
  waitForPoliteAnnouncement,
  failFurnitureAssetRequestsUntilRetry,
} from './support/editor-harness'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid ?scene= route for testing restore. */
function makeSceneRoute(
  items: FurnitureInstance[],
  options?: {
    floorFinishId?: string
    wallFinishId?: string
  },
): string {
  const payload = {
    v: 1 as const,
    items,
    ...(options?.floorFinishId ? { floorFinishId: options.floorFinishId } : {}),
    ...(options?.wallFinishId ? { wallFinishId: options.wallFinishId } : {}),
  }
  const params = new URLSearchParams()
  params.set('scene', JSON.stringify(payload))
  return `/?${params.toString()}`
}

async function ensureEnvironmentPanelExpanded(page: Page) {
  const wallFinishTrigger = page.getByLabel('Wall Finish')
  if (await wallFinishTrigger.isVisible()) {
    return
  }

  await page.getByRole('button', { name: 'Toggle environment panel' }).click()
  await expect(wallFinishTrigger).toBeVisible()
}

const VALID_ITEM = {
  id: 'furniture-instance-1',
  catalogId: 'armchair-1',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
}

// ---------------------------------------------------------------------------
// Restore tests
// ---------------------------------------------------------------------------

test('restores furniture from a valid ?scene= param on startup', async ({
  page,
}) => {
  await page.goto(makeSceneRoute([VALID_ITEM]))
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(1)
  expect(state.items[0].catalogId).toBe('armchair-1')
  expect(state.restoreOutcome).toBe('restored')
})

test('clears selection after restore', async ({ page }) => {
  await page.goto(makeSceneRoute([VALID_ITEM]))
  const state = await waitForEditorReady(page)

  expect(state.selectedId).toBeNull()
})

test('restores multiple items from a valid ?scene= param', async ({ page }) => {
  const items: FurnitureInstance[] = [
    {
      id: 'furniture-instance-1',
      catalogId: 'armchair-1',
      position: [0, 0, 0],
      rotationY: 0,
    },
    {
      id: 'furniture-instance-2',
      catalogId: 'couch-1',
      position: [1, 0, 1],
      rotationY: 1.57,
    },
  ]
  await page.goto(makeSceneRoute(items))
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(2)
  expect(state.restoreOutcome).toBe('restored')
})

test('populates outliner with restored items from ?scene=', async ({
  page,
}) => {
  const items: FurnitureInstance[] = [
    {
      id: 'furniture-instance-1',
      catalogId: 'armchair-1',
      position: [0, 0, 0],
      rotationY: 0,
    },
    {
      id: 'furniture-instance-2',
      catalogId: 'end-table-1',
      position: [1, 0, 1],
      rotationY: 0,
    },
  ]

  await page.goto(makeSceneRoute(items))
  await waitForEditorReady(page)

  await expect(
    page.getByRole('button', { name: /leather armchair/i }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /end table/i })).toBeVisible()
})

test('restores floor and wall finish IDs from a valid ?scene= param', async ({
  page,
}) => {
  await page.goto(
    makeSceneRoute([VALID_ITEM], {
      floorFinishId: 'granite-tile',
      wallFinishId: 'sage-green',
    }),
  )
  const state = await waitForEditorReady(page)

  expect(state.floorFinishId).toBe('granite-tile')
  expect(state.wallFinishId).toBe('sage-green')
  expect(state.restoreOutcome).toBe('restored')
})

test('ignores unknown floor and wall finish IDs from ?scene= while still restoring furniture', async ({
  page,
}) => {
  await page.goto(
    makeSceneRoute([VALID_ITEM], {
      floorFinishId: 'unknown-floor',
      wallFinishId: 'unknown-wall',
    }),
  )
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(1)
  expect(state.floorFinishId).toBe('wood-floor')
  expect(state.wallFinishId).toBe('light-gray')
  expect(state.restoreOutcome).toBe('restored')
})

test('shows no-param outcome for a URL without ?scene=', async ({ page }) => {
  await page.goto('/')
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('skipped')
})

test('shows error message and marks outcome invalid for a malformed ?scene= param', async ({
  page,
}) => {
  await page.goto('/?scene=notjson!!!')
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')

  // An error message should be visible to the user
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Shared link could not be restored' }),
  ).toBeVisible()
})

test('marks outcome invalid when catalogId does not exist in catalog', async ({
  page,
}) => {
  const invalidItem = { ...VALID_ITEM, catalogId: 'nonexistent-catalog-id-xyz' }
  await page.goto(makeSceneRoute([invalidItem]))
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')
})

test('one-shot guard: restore only fires once across asset-error retry', async ({
  page,
}) => {
  const assetFailure = await failFurnitureAssetRequestsUntilRetry(page)

  await page.goto(makeSceneRoute([VALID_ITEM]))

  // Wait for the error state
  await expect(page.getByText('The room editor could not start')).toBeVisible({
    timeout: 30_000,
  })

  // Allow assets to succeed on retry
  assetFailure.allowRequests()
  await page.getByRole('button', { name: 'Retry Loading' }).click()

  await waitForEditorReady(page)

  const state = await readSceneState(page)
  expect(state.restoreAttemptCount).toBe(1)
  expect(state.itemCount).toBe(1)
})

// ---------------------------------------------------------------------------
// Copy URL tests
// ---------------------------------------------------------------------------

test('Copy Scene URL button is visible in the toolbar', async ({ page }) => {
  await openEditor(page)
  await expect(
    page.getByRole('button', { name: 'Copy Scene URL to clipboard' }),
  ).toBeVisible()
})

test('Copy Scene URL announces success after click when clipboard is available', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openEditor(page)

  const copyBtn = page.getByRole('button', {
    name: 'Copy Scene URL to clipboard',
  })
  await copyBtn.click()

  await waitForPoliteAnnouncement(page, 'Scene URL copied to clipboard.')
})

test('error message clears on undo after restore-invalid', async ({ page }) => {
  // Start with invalid scene URL so an error message appears
  await page.goto('/?scene=notjson!!!')
  await waitForEditorReady(page)

  const statusRegion = page.getByRole('status', { name: 'Editor status' })
  await expect(statusRegion).toContainText('Shared link could not be restored')

  // Undo should clear the message (even though there's nothing to undo)
  await page.keyboard.press('Control+z')

  // The status element should be empty or gone
  await expect
    .poll(async () => {
      return statusRegion.textContent()
    })
    .toBe('')
})

test('error message clears on add furniture after restore-invalid', async ({
  page,
}) => {
  await page.goto('/?scene=notjson!!!')
  await waitForEditorReady(page)
  const restoreStatus = page
    .getByRole('status', { name: 'Editor status' })
    .filter({ hasText: 'Shared link could not be restored' })
  await expect(restoreStatus).toBeVisible()

  const addBtn = page.getByRole('button', { name: 'Add Furniture' })
  await addBtn.click()

  // Clicking a catalog item from the drawer should clear the message
  const drawerItem = page
    .getByRole('button', { name: /leather armchair/i })
    .first()
  if (await drawerItem.isVisible()) {
    await drawerItem.click()
    await expect
      .poll(async () => {
        const text = await restoreStatus.textContent().catch(() => null)
        return text === null || text.trim() === '' ? 'cleared' : 'set'
      })
      .toBe('cleared')
  }
})

// ---------------------------------------------------------------------------
// Round-trip bridge test
// ---------------------------------------------------------------------------

test('copy-URL-then-load round-trip: app serializer output is accepted by restore', async ({
  page,
  context,
}) => {
  // Grant clipboard permissions before any interaction
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await openEditor(page)

  await ensureEnvironmentPanelExpanded(page)

  // Change environment options so round-trip includes non-default finishes.
  await page.getByLabel('Wall Finish').click()
  await page.getByRole('option', { name: 'Sage Green' }).click()

  await page.getByLabel('Floor Finish').click()
  await page.getByRole('option', { name: 'Granite' }).click()

  // Add one item via the real UI so the app owns the scene state
  await addFurniture(page, 'Leather Armchair')

  // Use the app's own Copy Scene URL button — this exercises the real serializer
  const copyBtn = page.getByRole('button', {
    name: 'Copy Scene URL to clipboard',
  })
  await copyBtn.click()
  await waitForPoliteAnnouncement(page, 'Scene URL copied to clipboard.')

  // Read the URL the app wrote to the clipboard
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(copiedUrl).toContain('scene=')

  const copiedScenePayload = JSON.parse(
    new URL(copiedUrl).searchParams.get('scene') ?? '{}',
  ) as {
    floorFinishId?: string
    wallFinishId?: string
  }
  expect(copiedScenePayload.floorFinishId).toBe('granite-tile')
  expect(copiedScenePayload.wallFinishId).toBe('sage-green')

  // Navigate to the copied URL in the same page — the restore path must accept
  // what the serializer produced, confirming the round-trip contract
  await page.goto(copiedUrl)
  const restored = await waitForEditorReady(page)

  expect(restored.itemCount).toBe(1)
  expect(restored.restoreOutcome).toBe('restored')
  expect(restored.items[0].catalogId).toBe('armchair-1')
  expect(restored.floorFinishId).toBe('granite-tile')
  expect(restored.wallFinishId).toBe('sage-green')
})
