/**
 * Browser tests for the URL scene restore, share/copy URL, and draft storage features.
 *
 * Covers:
 *  - Successful restore from a valid `?scene=` param
 *  - Invalid payload raises an error toast and leaves scene empty
 *  - One-shot guard: restore only fires once across asset retry
 *  - Share button falls back to clipboard copy and announces success
 *  - Selection is cleared after restore
 *  - Full round-trip: copy URL in app → navigate to it → scene restored
 *  - Draft auto-save to localStorage on furniture changes
 *  - Draft persistence across page reloads
 *  - Error scenarios: clipboard failures, invalid scenes
 */
import { expect, test, type Page } from '@playwright/test'
import type { FurnitureInstance } from '../src/domain/furniture'
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
import { expectNoToasts, readToastTexts, waitForToast } from './support/toasts'

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
  lightingMoodId?: string
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
    lightingMoodId?: string
  },
): string {
  const payload = {
    v: 1 as const,
    items,
    ...(options?.floorFinishId ? { floorFinishId: options.floorFinishId } : {}),
    ...(options?.wallFinishId ? { wallFinishId: options.wallFinishId } : {}),
    ...(options?.lightingMoodId
      ? { lightingMoodId: options.lightingMoodId }
      : {}),
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

async function ensureRoomSurfaceOpen(page: Page) {
  const roomSurface = page.getByRole('complementary', { name: 'Room' })
  if (await roomSurface.isVisible()) {
    return roomSurface
  }

  await page.locator('button[aria-controls="room-surface"]').click()
  await expect(roomSurface).toBeVisible()

  return roomSurface
}

async function forceClipboardShareFallback(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: undefined,
    })
  })
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

test('restores floor, wall, and lighting mood IDs from a valid ?scene= param', async ({
  page,
}) => {
  await page.goto(
    makeSceneRoute([VALID_ITEM], {
      floorFinishId: 'granite-tile',
      wallFinishId: 'sage-green',
      lightingMoodId: 'warm-white',
    }),
  )
  const state = await waitForEditorReady(page)

  expect(state.floorFinishId).toBe('granite-tile')
  expect(state.wallFinishId).toBe('sage-green')
  expect(state.lightingMoodId).toBe('warm-white')
  expect(state.restoreOutcome).toBe('restored')
})

test('ignores unknown finish and lighting mood IDs from ?scene= while still restoring furniture', async ({
  page,
}) => {
  await page.goto(
    makeSceneRoute([VALID_ITEM], {
      floorFinishId: 'unknown-floor',
      wallFinishId: 'unknown-wall',
      lightingMoodId: 'unknown-mood',
    }),
  )
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(1)
  expect(state.floorFinishId).toBe('wood-floor')
  expect(state.wallFinishId).toBe('light-gray')
  expect(state.lightingMoodId).toBe('daylight')
  expect(state.restoreOutcome).toBe('restored')
})

test('normalizes unknown finish IDs from ?scene= so a reloaded empty room stays fresh', async ({
  page,
}) => {
  await page.goto(
    makeSceneRoute([], {
      floorFinishId: 'unknown-floor',
      wallFinishId: 'unknown-wall',
    }),
  )
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.floorFinishId).toBe('wood-floor')
  expect(state.wallFinishId).toBe('light-gray')

  await expect.poll(async () => readDraftFromStorage(page)).toBeNull()

  await page.reload()
  const reloadedState = await waitForEditorReady(page)

  expect(reloadedState.itemCount).toBe(0)
  expect(reloadedState.restoreOutcome).toBe('skipped')
  // A fresh reloaded room restores silently - no draft-restored success toast.
  await expectNoToasts(page)
})

test('shows an error toast and marks outcome invalid for a malformed ?scene= param', async ({
  page,
}) => {
  await page.goto('/?scene=notjson!!!')
  const state = await waitForEditorReady(page)

  expect(state.itemCount).toBe(0)
  expect(state.restoreOutcome).toBe('invalid')

  // The failure surfaces as a persistent error toast stating the consequence.
  const toast = await waitForToast(page, {
    text: 'Shared link could not be restored.',
    type: 'error',
  })
  await expect(toast).toContainText('Starting with an empty room.')
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
// Share/copy URL tests
// ---------------------------------------------------------------------------

test('Share button is visible in the toolbar', async ({ page }) => {
  await openEditor(page)
  await expect(
    page.getByRole('button', { name: 'Share room layout' }),
  ).toBeVisible()
})

test('Share button falls back to clipboard copy when native share is unavailable', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await forceClipboardShareFallback(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await openEditor(page)

  const copyBtn = page.getByRole('button', {
    name: 'Share room layout',
  })
  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })
  const infoButtonBoxBefore = await infoButton.boundingBox()

  if (!infoButtonBoxBefore) {
    throw new Error('Desktop info button bounding box was not available')
  }

  await copyBtn.click()

  await waitForPoliteAnnouncement(page, 'Scene URL copied to clipboard.')
  await expect(copyBtn).toContainText('Copied')

  const infoButtonBoxAfter = await infoButton.boundingBox()

  if (!infoButtonBoxAfter) {
    throw new Error(
      'Desktop info button bounding box was not available after share',
    )
  }

  expect(Math.abs(infoButtonBoxAfter.x - infoButtonBoxBefore.x)).toBeLessThan(1)
  expect(Math.abs(infoButtonBoxAfter.y - infoButtonBoxBefore.y)).toBeLessThan(1)

  await expect(copyBtn).toContainText('Share', { timeout: 3_000 })
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

// ---------------------------------------------------------------------------
// Round-trip bridge test
// ---------------------------------------------------------------------------

test('copy-URL-then-load round-trip: app serializer output is accepted by restore', async ({
  page,
  context,
}) => {
  // Grant clipboard permissions before any interaction
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await forceClipboardShareFallback(page)

  await openEditor(page)

  const roomSurface = await ensureRoomSurfaceOpen(page)

  // Change room options so round-trip includes non-default finishes.
  await roomSurface.locator('label').filter({ hasText: 'Sage Green' }).click()

  await roomSurface.getByRole('tab', { name: 'Floor' }).click()
  await roomSurface.locator('label').filter({ hasText: 'Granite' }).click()

  // The Lighting tab is the rightmost tab, where the camera-tools overlay can
  // intercept a pointer click; activate it via keyboard (programmatic focus
  // bypasses the overlap) before selecting a mood.
  const lightingTab = roomSurface.getByRole('tab', { name: 'Lighting' })
  await lightingTab.focus()
  await lightingTab.press('Enter')
  await expect(
    roomSurface.getByRole('tabpanel', { name: 'Lighting' }),
  ).toBeVisible()
  await roomSurface
    .locator('label')
    .filter({ hasText: 'Soft Lamplight' })
    .click()

  await page.locator('button[aria-controls="room-surface"]').click()
  await expect(roomSurface).toBeHidden()

  // Add one item via the real UI so the app owns the scene state
  await addFurniture(page, 'Leather Armchair')

  // Use the app's own Share button with clipboard fallback - this exercises the real serializer
  const copyBtn = page.getByRole('button', {
    name: 'Share room layout',
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
    lightingMoodId?: string
  }
  expect(copiedScenePayload.floorFinishId).toBe('granite-tile')
  expect(copiedScenePayload.wallFinishId).toBe('sage-green')
  expect(copiedScenePayload.lightingMoodId).toBe('soft-lamplight')

  // Navigate to the copied URL in the same page - the restore path must accept
  // what the serializer produced, confirming the round-trip contract
  await page.goto(copiedUrl)
  const restored = await waitForEditorReady(page)

  expect(restored.itemCount).toBe(1)
  expect(restored.restoreOutcome).toBe('restored')
  expect(restored.items[0].catalogId).toBe('armchair-1')
  expect(restored.floorFinishId).toBe('granite-tile')
  expect(restored.wallFinishId).toBe('sage-green')
  expect(restored.lightingMoodId).toBe('soft-lamplight')
})

// ---------------------------------------------------------------------------
// Draft auto-save and determinism tests
// ---------------------------------------------------------------------------

test('auto-saves furniture to localStorage draft when furniture is added', async ({
  page,
}) => {
  await openEditor(page)

  // Fresh/default scenes should not create a draft until the user changes them.
  const draftBefore = await readDraftFromStorage(page)
  expect(draftBefore).toBeNull()

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

test('start over clears the saved draft so reload stays fresh', async ({
  page,
}) => {
  await openEditor(page)

  await addFurniture(page, 'Leather Armchair')

  const draftBeforeReset = await readDraftFromStorage(page)
  expect(draftBeforeReset).not.toBeNull()
  expect(draftBeforeReset?.items.length).toBe(1)

  const startOverButton = page.getByRole('button', {
    name: 'Start over',
  })
  await startOverButton.click()

  const startOverDialog = page.getByRole('alertdialog', {
    name: /start over\?/i,
  })
  await expect(startOverDialog).toBeVisible()
  await startOverDialog.getByRole('button', { name: 'Start Over' }).click()

  const resetState = await waitForEditorReady(page)
  expect(resetState.itemCount).toBe(0)
  expect(resetState.floorFinishId).toBe('wood-floor')
  expect(resetState.wallFinishId).toBe('light-gray')
  expect(resetState.lightingMoodId).toBe('daylight')

  await expect.poll(async () => readDraftFromStorage(page)).toBeNull()

  await page.reload()
  const reloadedState = await waitForEditorReady(page)

  expect(reloadedState.itemCount).toBe(0)
  expect(reloadedState.restoreOutcome).toBe('skipped')
  // The cleared draft restores silently - no draft-restored success toast.
  await expectNoToasts(page)
})

// ---------------------------------------------------------------------------
// Error scenario tests
// ---------------------------------------------------------------------------

test('handles clipboard API failure gracefully when permission denied', async ({
  page,
}) => {
  // Do NOT grant clipboard permissions - this simulates a denied permission
  await forceClipboardShareFallback(page)
  await openEditor(page)
  await addFurniture(page, 'Leather Armchair')

  const copyBtn = page.getByRole('button', {
    name: 'Share room layout',
  })
  await copyBtn.click()

  // The clipboard failure surfaces as a persistent error toast.
  await waitForToast(page, {
    text: 'Could not copy URL to clipboard.',
    type: 'error',
  })
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

  // A fresh empty startup raises no feedback that could pollute the
  // post-reload silence check.
  await expectNoToasts(page)

  // Reload the page - this will trigger draft restoration from localStorage
  await page.reload()
  const stateAfter = await waitForEditorReady(page)

  // Verify scene is still empty
  expect(stateAfter.itemCount).toBe(0)
  expect(stateAfter.restoreOutcome).toBe('skipped')

  // Verify startup restore remains silent for empty drafts: no toast at all,
  // and no restore messaging on either announcer channel.
  await expect
    .poll(
      async () => {
        const polite = await readPoliteAnnouncement(page)
        const assertive = await readAssertiveAnnouncement(page)
        const toastTexts = await readToastTexts(page)

        const restoreStrings = [
          'Restored your saved draft.',
          'Recovered your local draft.',
          'Shared link could not be restored',
        ]

        const hasRestoreMessage =
          toastTexts.length > 0 ||
          restoreStrings.some((text) => polite.includes(text)) ||
          restoreStrings.some((text) => assertive.includes(text))

        return hasRestoreMessage
      },
      { timeout: 1000, intervals: [100] },
    )
    .toBe(false)
})
