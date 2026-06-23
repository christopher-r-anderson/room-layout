// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetSceneStateStore,
  sceneStateStore,
} from '@/core/stores/scene-state-store'
import {
  resetSelectionMetaStore,
  selectionMetaStore,
} from '@/core/stores/selection-meta-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import {
  resetAssetsStore,
  assetsActions,
} from '@/core/stores/assets-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import { resetCatalogSelectionStore } from './catalog-selection-store'
import { addFurniture } from './catalog-actions'

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
  resetSceneStateStore()
  resetSelectionMetaStore()
  resetEditorLifecycleStore()
  resetAssetsStore()
  resetCatalogSelectionStore()
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
  it('clears stale add state without invoking the scene while disabled', () => {
    resetEditorLifecycleStore()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const addFurnitureCommand = vi.spyOn(sceneCommands, 'addFurniture')

    expect(addFurniture()).toBe(false)
    expect(addFurnitureCommand).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(null)
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })

  it('maps add-furniture failures through shared messages', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const addFurnitureCommand = vi.spyOn(sceneCommands, 'addFurniture')

    addFurnitureCommand.mockReturnValueOnce({ ok: false, reason: 'no-space' })
    expect(addFurniture()).toBe(false)
    expect(sceneStateStore.getState().editorMessage).toBe(
      ADD_FURNITURE_NO_SPACE_MESSAGE,
    )

    addFurnitureCommand.mockReturnValueOnce({
      ok: false,
      reason: 'unknown-catalog',
    })
    expect(addFurniture()).toBe(false)
    expect(sceneStateStore.getState().editorMessage).toBe(
      ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
    )
  })

  it('marks toolbar selection effects after a successful add', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'addFurniture').mockReturnValue({
      ok: true,
      id: 'item-1',
    })

    expect(addFurniture()).toBe(true)
    expect(selectionMetaStore.getState().selectedSource).toBe('toolbar')
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith('toolbar')
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'added',
      requestOutlinerFocus: false,
    })
  })
})
