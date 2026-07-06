// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { resetSceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  useFeedbackStore,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import {
  resetSelectionFocusStore,
  useSelectionFocusStore,
} from '@/core/stores/selection-focus-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { resetAssetsStore, assetsActions } from '@/core/stores/assets-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
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

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/core/operations/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
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
  resetSelectionFocusStore()
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
  it('clears stale add state without invoking the scene while not ready', async () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const addFurnitureCommand = vi.spyOn(sceneCommands, 'addFurniture')

    expect(await addFurniture()).toBe(false)
    expect(addFurnitureCommand).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(null)
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })

  it('maps add-furniture failures through shared messages', async () => {
    catalogSelectionActions.setSelectedCatalogId('chair')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const addFurnitureCommand = vi.spyOn(sceneCommands, 'addFurniture')

    addFurnitureCommand.mockReturnValueOnce({ ok: false, reason: 'no-space' })
    expect(await addFurniture()).toBe(false)
    expect(toast.error).toHaveBeenLastCalledWith(
      i18n._(ADD_FURNITURE_NO_SPACE_MESSAGE),
    )
    // Also announced assertively: the drawer aria-hides the toast region but
    // live regions are exempt, so the announcer reaches assistive tech. The
    // announcement lands on the store's clear-then-set tick.
    await vi.waitFor(() => {
      expect(useFeedbackStore.getState().assertiveAnnouncement).toBe(
        i18n._(ADD_FURNITURE_NO_SPACE_MESSAGE),
      )
    })

    addFurnitureCommand.mockReturnValueOnce({
      ok: false,
      reason: 'unknown-catalog',
    })
    expect(await addFurniture()).toBe(false)
    expect(toast.error).toHaveBeenLastCalledWith(
      i18n._(ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE),
    )
  })

  it('marks toolbar selection effects after a successful add', async () => {
    catalogSelectionActions.setSelectedCatalogId('chair')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'addFurniture').mockReturnValue({
      ok: true,
      id: 'item-1',
    })

    expect(await addFurniture()).toBe(true)
    expect(useSelectionFocusStore.getState().selectedSource).toBe('toolbar')
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith('toolbar')
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'added',
      requestOutlinerFocus: false,
    })
  })
})
