// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel, SceneRef } from '@/scene/scene.types'
import { useSceneSync } from './use-scene-sync'

function createFurnitureItem(id: string, name: string): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

function createSceneRef(readModel: SceneReadModel) {
  return {
    current: {
      addFurniture: vi.fn(() => ({ ok: true as const, id: 'new-item' })),
      clearSelection: vi.fn(),
      deleteSelection: vi.fn(() => true),
      getReadModel: vi.fn(() => readModel),
      getSnapshot: vi.fn(),
      moveSelection: vi.fn(() => ({
        ok: true as const,
        position: [0, 0, 0] as [number, number, number],
      })),
      redo: vi.fn(() => true),
      rotateSelection: vi.fn(),
      selectById: vi.fn(() => ({
        ok: true as const,
        status: 'selected' as const,
      })),
      undo: vi.fn(() => true),
    } satisfies SceneRef,
  }
}

describe('useSceneSync', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when scene ref is unavailable', () => {
    const handleSceneReadModelChange = vi.fn()
    const announcePolite = vi.fn()
    const sceneRef = { current: null as SceneRef | null }

    const { result } = renderHook(() =>
      useSceneSync({
        sceneRef,
        isModalOpen: false,
        handleSceneReadModelChange,
        announcePolite,
      }),
    )

    let next: SceneReadModel | null = null
    act(() => {
      next = result.current.syncSceneReadModel()
    })

    expect(next).toBeNull()
    expect(handleSceneReadModelChange).not.toHaveBeenCalled()
    expect(announcePolite).not.toHaveBeenCalled()
    expect(result.current.outlinerFocusRequest).toBeNull()
  })

  it('syncs read model, announces selection changes, and requests focus', () => {
    vi.spyOn(Date, 'now').mockReturnValue(101)

    const selectedItem = createFurnitureItem('item-1', 'Armchair')
    const readModel: SceneReadModel = {
      selectedId: selectedItem.id,
      items: [selectedItem],
    }

    const sceneRef = createSceneRef(readModel)
    const handleSceneReadModelChange = vi.fn()
    const announcePolite = vi.fn()

    const { result } = renderHook(() =>
      useSceneSync({
        sceneRef,
        isModalOpen: false,
        handleSceneReadModelChange,
        announcePolite,
      }),
    )

    act(() => {
      result.current.syncSceneReadModel()
    })

    expect(handleSceneReadModelChange).toHaveBeenCalledWith(readModel)
    expect(announcePolite).toHaveBeenCalledWith('Armchair selected.')
    expect(result.current.outlinerFocusRequest).toEqual({
      token: 101,
      targetSelectedId: 'item-1',
    })
  })

  it('respects options that disable announcements and focus requests', () => {
    const selectedItem = createFurnitureItem('item-1', 'Armchair')
    const readModel: SceneReadModel = {
      selectedId: selectedItem.id,
      items: [selectedItem],
    }

    const sceneRef = createSceneRef(readModel)
    const handleSceneReadModelChange = vi.fn()
    const announcePolite = vi.fn()

    const { result } = renderHook(() =>
      useSceneSync({
        sceneRef,
        isModalOpen: false,
        handleSceneReadModelChange,
        announcePolite,
      }),
    )

    act(() => {
      result.current.syncSceneReadModel({
        announceSelectionChange: false,
        requestOutlinerFocus: false,
      })
    })

    expect(handleSceneReadModelChange).toHaveBeenCalledWith(readModel)
    expect(announcePolite).not.toHaveBeenCalled()
    expect(result.current.outlinerFocusRequest).toBeNull()
  })

  it('announces selection cleared and requests container focus when selection is removed', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(201).mockReturnValueOnce(202)

    const selectedItem = createFurnitureItem('item-1', 'Armchair')
    const initialReadModel: SceneReadModel = {
      selectedId: selectedItem.id,
      items: [selectedItem],
    }
    const clearedReadModel: SceneReadModel = {
      selectedId: null,
      items: [selectedItem],
    }

    const sceneRef = createSceneRef(initialReadModel)
    const getReadModel = sceneRef.current.getReadModel as ReturnType<
      typeof vi.fn
    >
    getReadModel
      .mockReturnValueOnce(initialReadModel)
      .mockReturnValueOnce(clearedReadModel)

    const handleSceneReadModelChange = vi.fn()
    const announcePolite = vi.fn()

    const { result } = renderHook(() =>
      useSceneSync({
        sceneRef,
        isModalOpen: false,
        handleSceneReadModelChange,
        announcePolite,
      }),
    )

    act(() => {
      result.current.syncSceneReadModel()
    })
    act(() => {
      result.current.handleOutlinerFocusHandled()
    })
    act(() => {
      result.current.syncSceneReadModel()
    })

    expect(announcePolite).toHaveBeenCalledWith('Selection cleared.')
    expect(result.current.outlinerFocusRequest).toEqual({
      token: 202,
      focusContainer: true,
    })
  })

  it('does not request outliner focus while a modal is open', () => {
    const selectedItem = createFurnitureItem('item-1', 'Armchair')
    const readModel: SceneReadModel = {
      selectedId: selectedItem.id,
      items: [selectedItem],
    }

    const sceneRef = createSceneRef(readModel)

    const { result } = renderHook(() =>
      useSceneSync({
        sceneRef,
        isModalOpen: true,
        handleSceneReadModelChange: vi.fn(),
        announcePolite: vi.fn(),
      }),
    )

    act(() => {
      result.current.syncSceneReadModel()
    })

    expect(result.current.outlinerFocusRequest).toBeNull()
  })

  it('supports explicit outliner index requests and clear handling', () => {
    vi.spyOn(Date, 'now').mockReturnValue(303)

    const selectedItem = createFurnitureItem('item-1', 'Armchair')
    const sceneRef = createSceneRef({
      selectedId: selectedItem.id,
      items: [selectedItem],
    })

    const { result } = renderHook(() =>
      useSceneSync({
        sceneRef,
        isModalOpen: false,
        handleSceneReadModelChange: vi.fn(),
        announcePolite: vi.fn(),
      }),
    )

    act(() => {
      result.current.requestOutlinerFocusByIndex(4)
    })

    expect(result.current.outlinerFocusRequest).toEqual({
      token: 303,
      preferredIndex: 4,
    })

    act(() => {
      result.current.handleOutlinerFocusHandled()
    })

    expect(result.current.outlinerFocusRequest).toBeNull()
  })
})
