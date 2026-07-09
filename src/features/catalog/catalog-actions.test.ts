// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appToastManager } from '@/core/feedback/toast-manager'
import { resetSceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import { resetSelectionStore } from '@/core/stores/selection-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { resetAssetsStore, assetsActions } from '@/core/stores/assets-store'
import { announceSelectionChange } from '@/core/operations/selection-actions'
import { sceneCommands } from '@/core/scene-commands'
import { addFurniture as addFurnitureToDocument } from '@/core/operations/furniture-mutations'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import { i18n } from '@/shared/i18n/i18n'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import {
  catalogSelectionActions,
  resetCatalogSelectionStore,
} from './catalog-selection-store'
import { addFurniture } from './catalog-actions'

vi.mock('@/core/operations/furniture-mutations', () => ({
  addFurniture: vi.fn(),
  deleteSelection: vi.fn(),
  moveSelection: vi.fn(),
  rotateSelection: vi.fn(),
  setSelectionTransform: vi.fn(),
}))

vi.mock('@/core/operations/selection-actions', () => ({
  announceSelectionChange: vi.fn(),
}))

const CHAIR: FurnitureCatalogEntry = {
  id: 'chair',
  name: 'Chair',
  kind: 'armchair',
  collectionId: 'collection-1',
  nodeName: 'ChairNode',
  footprintSize: { width: 1, depth: 1 },
  previewPath: '/previews/chair.png',
}

beforeEach(() => {
  resetSceneDocumentStore()
  resetSelectionStore()
  resetEditorLifecycleStore()
  resetAssetsStore()
  resetCatalogSelectionStore()
  resetFeedbackStore()
  assetsActions.setAssets({
    catalog: [CHAIR],
    collections: [],
    environmentConfig: null,
  })
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('addFurniture', () => {
  it('does not invoke the document mutation or announce while not ready', async () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)

    expect(await addFurniture()).toBe(false)
    expect(addFurnitureToDocument).not.toHaveBeenCalled()
    expect(announceSelectionChange).not.toHaveBeenCalled()
  })

  it('maps add-furniture failures through shared messages', async () => {
    catalogSelectionActions.setSelectedCatalogId('chair')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')
    const addFurnitureMutation = vi.mocked(addFurnitureToDocument)

    addFurnitureMutation.mockReturnValueOnce({ ok: false, reason: 'no-space' })
    expect(await addFurniture()).toBe(false)
    expect(addToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: i18n._(ADD_FURNITURE_NO_SPACE_MESSAGE),
        type: 'error',
        priority: 'high',
      }),
    )
    // Also announced assertively: the drawer aria-hides the toast region but
    // live regions are exempt, so the announcer reaches assistive tech. The
    // announcement lands on the store's clear-then-set tick.
    await vi.waitFor(() => {
      expect(feedbackStoreForTests.getState().assertiveAnnouncement).toBe(
        i18n._(ADD_FURNITURE_NO_SPACE_MESSAGE),
      )
    })

    addFurnitureMutation.mockReturnValueOnce({
      ok: false,
      reason: 'unknown-catalog',
    })
    expect(await addFurniture()).toBe(false)
    expect(addToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: i18n._(ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE),
        type: 'error',
      }),
    )
  })

  it('selects with the toolbar source and announces the add', async () => {
    catalogSelectionActions.setSelectedCatalogId('chair')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(addFurnitureToDocument).mockReturnValue({
      ok: true,
      id: 'item-1',
    })

    expect(await addFurniture()).toBe(true)
    expect(addFurnitureToDocument).toHaveBeenCalledWith('chair', {
      source: 'toolbar',
    })
    expect(announceSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        announceMode: 'added',
        newId: 'item-1',
        previousSelectedId: null,
      }),
    )
  })
})
