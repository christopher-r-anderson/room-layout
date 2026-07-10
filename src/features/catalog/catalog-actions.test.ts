// @vitest-environment jsdom
import {
  appToastManager,
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSceneDocumentStore } from '@/core/stores/scene-document-store'
import { resetSelectionStore } from '@/core/stores/selection-store'
import { resetDialogStore } from '@/core/stores/dialog-store'
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
  getActiveCatalogId,
  resetCatalogSelectionStore,
} from './catalog-selection-store'
import { addFurniture, setCatalogDrawerOpen } from './catalog-actions'

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
  resetDialogStore()
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
    // The toast is the single surface; the assertive channel stays empty.
    expect(feedbackStoreForTests.getState().assertive.text).toBe('')

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

  it('adds the active catalog item and announces the add', async () => {
    catalogSelectionActions.setSelectedCatalogId('chair')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(addFurnitureToDocument).mockReturnValue({
      ok: true,
      id: 'item-1',
    })

    expect(await addFurniture()).toBe(true)
    expect(addFurnitureToDocument).toHaveBeenCalledWith('chair')
    expect(announceSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        announceMode: 'added',
        newId: 'item-1',
        previousSelectedId: null,
      }),
    )
  })
})

describe('setCatalogDrawerOpen', () => {
  it('clears the previous selection each time the drawer opens', () => {
    catalogSelectionActions.setSelectedCatalogId('chair')
    expect(getActiveCatalogId()).toBe('chair')

    setCatalogDrawerOpen(true)

    // A blank slate on every open: the last-added (or considered) item does not
    // stay pre-selected.
    expect(getActiveCatalogId()).toBe('')
  })

  it('leaves the selection untouched when the drawer closes', () => {
    catalogSelectionActions.setSelectedCatalogId('chair')

    setCatalogDrawerOpen(false)

    expect(getActiveCatalogId()).toBe('chair')
  })
})
