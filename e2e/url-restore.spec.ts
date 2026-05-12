/**
 * Browser tests for the URL scene restore, copy-URL, and draft storage features.
 *
 * Covers:
 *  - Successful restore from a valid `?scene=` param
 *  - Invalid payload shows error message and leaves scene empty
 *  - One-shot guard: restore only fires once across asset retry
 *  - Copy Scene URL button writes to clipboard and announces success
 *  - Selection is cleared after restore
 *  - Full round-trip: copy URL in app → navigate to it → scene restored
 *  - Draft auto-save to localStorage on furniture changes
 *  - Draft persistence across page reloads
 *  - Error scenarios: scene too large, clipboard failures, invalid scenes
 */
import { expect, test, type Page } from '@playwright/test'
import type { FurnitureInstance } from '../src/scene/objects/furniture.types'
import {
  addFurniture,
  openEditor,
  readSceneState,
  readAssertiveAnnouncement,
  readPoliteAnnouncement,
  waitForEditorReady,
  waitForPoliteAnnouncement,
  failFurnitureAssetRequestsUntilRetry,
} from './support/editor-harness'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface SceneDraftPayload {
  version: 1
  items: {
    id: string
    catalogId: string
    position: [number, number, number]
    rotationY: number
  }[]
  floorFinishId?: string
  wallFinishId?: string
}

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

/** Safely read and parse draft from localStorage. */
async function readDraftFromStorage(
  page: Page,
): Promise<SceneDraftPayload | null> {
  const rawData = await page.evaluate(() => {
    return localStorage.getItem('room-layout:scene-draft')
  })

  if (!rawData) {
    return null
  }

  try {
    const parsed = JSON.parse(rawData) as SceneDraftPayload
    return parsed
  } catch {
    return null
  }
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

test('consumes ?scene= from the URL after restore attempt', async ({
  page,
}) => {
  await page.goto(makeSceneRoute([VALID_ITEM]))
  await waitForEditorReady(page)

  await expect
    .poll(() => new URL(page.url()).searchParams.has('scene'))
    .toBe(false)
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
  await expect(copyBtn).toContainText('Copied')
  await expect(copyBtn).toContainText('Copy Scene URL', { timeout: 3_000 })
})

test('invalid shared link falls back to local draft when available', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'room-layout:scene-draft',
      JSON.stringify({
        version: 1,
        items: [
          {
            id: 'furniture-instance-77',
            catalogId: 'armchair-1',
            position: [0, 0, 0],
            rotationY: 0,
          },
        ],
        floorFinishId: 'granite-tile',
        wallFinishId: 'sage-green',
      }),
    )
  })

  await page.goto('/?scene=notjson!!!')
  const state = await waitForEditorReady(page)

  expect(state.restoreOutcome).toBe('invalid')
  expect(state.itemCount).toBe(1)
  expect(state.items[0].catalogId).toBe('armchair-1')
  expect(state.floorFinishId).toBe('granite-tile')
  expect(state.wallFinishId).toBe('sage-green')
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

  // Use the app's own Copy Scene URL button - this exercises the real serializer
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

  // Navigate to the copied URL in the same page - the restore path must accept
  // what the serializer produced, confirming the round-trip contract
  await page.goto(copiedUrl)
  const restored = await waitForEditorReady(page)

  expect(restored.itemCount).toBe(1)
  expect(restored.restoreOutcome).toBe('restored')
  expect(restored.items[0].catalogId).toBe('armchair-1')
  expect(restored.floorFinishId).toBe('granite-tile')
  expect(restored.wallFinishId).toBe('sage-green')
})

// ---------------------------------------------------------------------------
// Draft auto-save and determinism tests
// ---------------------------------------------------------------------------

test('auto-saves furniture to localStorage draft when furniture is added', async ({
  page,
}) => {
  await openEditor(page)

  // Get the initial draft (which exists with empty items by default)
  const draftBefore = await readDraftFromStorage(page)
  expect(draftBefore).not.toBeNull()
  expect(draftBefore?.items.length).toBe(0)

  // Add furniture
  await addFurniture(page, 'Leather Armchair')

  // Verify draft was updated with the new furniture
  const draftAfter = await readDraftFromStorage(page)

  expect(draftAfter).not.toBeNull()
  expect(draftAfter?.version).toBe(1)
  expect(draftAfter?.items.length).toBe(1)
  expect(draftAfter?.items[0].catalogId).toBe('armchair-1')
})

test('draft persists across page reload', async ({ page }) => {
  await openEditor(page)

  // Add furniture
  await addFurniture(page, 'Leather Armchair')

  // Read the initial state
  const stateBefore = await readSceneState(page)
  expect(stateBefore.itemCount).toBe(1)

  // Reload the page
  await page.reload()
  const stateAfter = await waitForEditorReady(page)

  // Verify draft was restored from localStorage (item persists after reload)
  expect(stateAfter.itemCount).toBe(1)
  expect(stateAfter.items[0].catalogId).toBe('armchair-1')
  // Note: restoreOutcome is 'skipped' because there's no ?scene= param,
  // but the scene is still populated from the saved draft
})

test('draft items are stored in deterministic order (sorted by ID)', async ({
  page,
}) => {
  await openEditor(page)

  // Add furniture in non-alphabetical order
  await addFurniture(page, 'End Table')
  await addFurniture(page, 'Leather Armchair')

  // Get the draft from localStorage
  const draft = await readDraftFromStorage(page)

  // Verify items are sorted by ID
  expect(draft).not.toBeNull()
  expect(draft?.items.length).toBe(2)
  const ids = draft?.items.map((item) => item.id) ?? []
  const sortedIds = [...ids].sort()
  expect(ids).toEqual(sortedIds)
})

// ---------------------------------------------------------------------------
// Error scenario tests
// ---------------------------------------------------------------------------

test('handles clipboard API failure gracefully when permission denied', async ({
  page,
}) => {
  // Do NOT grant clipboard permissions - this simulates a denied permission
  await openEditor(page)
  await addFurniture(page, 'Leather Armchair')

  const copyBtn = page.getByRole('button', {
    name: 'Copy Scene URL to clipboard',
  })
  await copyBtn.click()

  // Should show an error message about clipboard failure
  const statusRegion = page.getByRole('status', { name: 'Editor status' })
  await expect(statusRegion).toContainText('Could not copy URL to clipboard', {
    timeout: 5_000,
  })
})

test('restores no furniture and shows error for completely malformed JSON in URL', async ({
  page,
}) => {
  await page.goto('/?scene={invalid json')
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')

  const errorMsg = page
    .getByRole('status')
    .filter({ hasText: 'Shared link could not be restored' })
  await expect(errorMsg).toBeVisible()
})

test('ignores malformed items array in scene payload', async ({ page }) => {
  const invalidPayload = {
    v: 1 as const,
    items: 'not-an-array', // Invalid: should be array
  }
  const params = new URLSearchParams()
  params.set('scene', JSON.stringify(invalidPayload))

  await page.goto(`/?${params.toString()}`)
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')
})

test('clears error message when furniture is added after failed restore', async ({
  page,
}) => {
  // Start with invalid scene URL
  await page.goto('/?scene=invalid!!!')
  await waitForEditorReady(page)

  const statusRegion = page.getByRole('status', { name: 'Editor status' })
  await expect(statusRegion).toContainText('Shared link could not be restored')

  // Add furniture via UI
  await addFurniture(page, 'Leather Armchair')

  // Error message should clear
  await expect(statusRegion).toBeEmpty({ timeout: 5_000 })
})

test('handles scene with missing required position field', async ({ page }) => {
  const invalidItem = {
    id: 'furniture-instance-1',
    catalogId: 'armchair-1',
    // Missing position - required field
    rotationY: 0,
  }
  await page.goto(makeSceneRoute([invalidItem as FurnitureInstance]))
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')
})

test('handles scene with missing required catalogId', async ({ page }) => {
  const invalidItem = {
    id: 'furniture-instance-1',
    // Missing catalogId - required field
    position: [0, 0, 0] as [number, number, number],
    rotationY: 0,
  }
  await page.goto(makeSceneRoute([invalidItem as FurnitureInstance]))
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')
})

test('handles draft with valid catalog reference but non-finite position gracefully', async ({
  page,
}) => {
  // Create a draft payload with valid catalogId but missing required position field.
  // This will pass validateCatalogReferences (only checks catalogIds) but fail when
  // restoreInitialLayout tries to use the position. This tests the edge case recovery.
  const corruptedDraft = {
    version: 1,
    items: [
      {
        id: 'furniture-instance-1',
        catalogId: 'armchair-1', // Valid catalog ID passes validateCatalogReferences
        // Missing or invalid position would cause restoreInitialLayout to fail
        position: NaN, // Non-array, non-serializable - JSON converts to null
        rotationY: 0,
      },
    ],
  }

  await page.goto('/')

  // Pre-populate localStorage with a corrupted draft.
  // Note: JSON.stringify converts NaN to null, which when read back will fail
  // position validation in restoreInitialLayout.
  await page.evaluate((draft) => {
    const sanitized = JSON.parse(JSON.stringify(draft)) as SceneDraftPayload
    localStorage.setItem('room-layout:scene-draft', JSON.stringify(sanitized))
  }, corruptedDraft)

  // Reload to trigger startup with the corrupted draft
  await page.reload()
  const state = await waitForEditorReady(page)

  // App should gracefully degrade: empty scene, no items loaded, skipped outcome
  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('skipped')

  // The test passes as long as the app doesn't crash during startup with a corrupted draft.
  // This verifies the try/catch protection added for draft restore fallback paths works.
})

test('empty draft restores silently without showing success toast on reload', async ({
  page,
}) => {
  // Verify that restoring an empty draft (normal startup state) does NOT show a success toast.
  // This prevents noisy notifications on ordinary app opens/reloads.

  await openEditor(page)
  // Do nothing - scene is empty
  const stateInitial = await readSceneState(page)
  expect(stateInitial.itemCount).toBe(0)

  // Clear any existing toasts
  await page.waitForTimeout(500)

  // Reload the page - this will trigger draft restoration from localStorage
  await page.reload()
  const stateAfter = await waitForEditorReady(page)

  // Verify scene is still empty
  expect(stateAfter.itemCount).toBe(0)
  expect(stateAfter.restoreOutcome).toBe('skipped')

  // Verify startup restore remains silent for empty drafts by checking only
  // restore-specific messaging channels/text, not unrelated status/alerts.
  await expect
    .poll(
      async () => {
        const polite = await readPoliteAnnouncement(page)
        const assertive = await readAssertiveAnnouncement(page)
        const editorStatusText =
          (await page
            .getByRole('status', { name: 'Editor status' })
            .textContent()
            .catch(() => null)) ?? ''

        const restoreStrings = [
          'Recovered your local draft.',
          'Shared link could not be restored',
        ]

        const hasRestoreMessage =
          restoreStrings.some((text) => polite.includes(text)) ||
          restoreStrings.some((text) => assertive.includes(text)) ||
          restoreStrings.some((text) => editorStatusText.includes(text))

        return hasRestoreMessage
      },
      { timeout: 1000, intervals: [100] },
    )
    .toBe(false)
})
