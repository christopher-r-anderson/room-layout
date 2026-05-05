import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createHistoryState, type HistoryState } from '@/lib/ui/editor-history'
import type { FurnitureItem } from '../objects/furniture.types'
import {
  addFurnitureToHistory,
  areFurnitureCollectionsEqual,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
  rotateSelectedFurnitureInHistory,
  updateFurniturePositionInHistory,
} from './furniture-operations'

const catalogMocks = vi.hoisted(() => ({
  getFurnitureCatalogEntry: vi.fn(),
  getCollectionPath: vi.fn(),
}))

const spawnMocks = vi.hoisted(() => ({
  findFurnitureSpawnPosition: vi.fn(),
}))

const layoutMocks = vi.hoisted(() => ({
  resolveRotatedFurnitureTransform: vi.fn(),
}))

vi.mock('../objects/furniture-catalog', () => ({
  getFurnitureCatalogEntry: catalogMocks.getFurnitureCatalogEntry,
  getCollectionPath: catalogMocks.getCollectionPath,
}))

vi.mock('@/lib/three/furniture-spawn', () => ({
  findFurnitureSpawnPosition: spawnMocks.findFurnitureSpawnPosition,
}))

vi.mock('@/lib/three/furniture-layout', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/three/furniture-layout')
  >('@/lib/three/furniture-layout')

  return {
    ...actual,
    resolveRotatedFurnitureTransform:
      layoutMocks.resolveRotatedFurnitureTransform,
  }
})

const SOURCE_PATH = '/models/source.glb'

const CATALOG_ENTRY = {
  id: 'catalog-couch',
  name: 'Catalog Couch',
  kind: 'couch' as const,
  collectionId: 'collection-couch',
  nodeName: 'couch-node',
  footprintSize: {
    width: 2,
    depth: 1,
  },
}

const ROTATE_BOUNDS = {
  minX: -5,
  maxX: 5,
  minZ: -5,
  maxZ: 5,
}

function createFurnitureItem(
  id: string,
  overrides?: Partial<FurnitureItem>,
): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-couch',
    name: 'Catalog Couch',
    kind: 'couch',
    collectionId: 'collection-couch',
    nodeName: 'couch-node',
    sourcePath: SOURCE_PATH,
    footprintSize: {
      width: 2,
      depth: 1,
    },
    position: [0, 0, 0],
    rotationY: 0,
    ...overrides,
  }
}

function createSourceScene() {
  return {
    getObjectByName: vi.fn(() => ({
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      rotation: {
        y: 0,
      },
    })),
  }
}

function defaultAddOptions(
  overrides?: Partial<{
    history: HistoryState<FurnitureItem[]>
    catalogId: string
    nextId: string
    edgeSnapThreshold: number
    snapSize: number
  }>,
) {
  const sourceScenesByPath = new Map([
    [SOURCE_PATH, createSourceScene() as unknown as import('three').Object3D],
  ])

  return {
    history: createHistoryState<FurnitureItem[]>([]),
    catalogId: CATALOG_ENTRY.id,
    nextId: 'furniture-instance-1',
    bounds: {
      minX: -5,
      maxX: 5,
      minZ: -5,
      maxZ: 5,
    },
    edgeSnapThreshold: 0.5,
    snapSize: 0.25,
    sourceScenesByPath,
    ...overrides,
  }
}

describe('furniture-operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    catalogMocks.getFurnitureCatalogEntry.mockImplementation((catalogId) => {
      return catalogId === CATALOG_ENTRY.id ? CATALOG_ENTRY : null
    })
    catalogMocks.getCollectionPath.mockReturnValue(SOURCE_PATH)
    spawnMocks.findFurnitureSpawnPosition.mockReturnValue([1, 0, 1])
    layoutMocks.resolveRotatedFurnitureTransform.mockReturnValue({
      position: [2, 0, 2],
      rotationY: Math.PI / 2,
    })
  })

  it('createFurnitureInstanceId returns the expected string format', () => {
    expect(createFurnitureInstanceId(7)).toBe('furniture-instance-7')
  })

  it('areFurnitureCollectionsEqual compares arrays by length and item fields', () => {
    const base = createFurnitureItem('item-1')

    expect(areFurnitureCollectionsEqual([base], [base])).toBe(true)
    expect(areFurnitureCollectionsEqual([base], [])).toBe(false)
    expect(
      areFurnitureCollectionsEqual(
        [base],
        [createFurnitureItem('item-1', { rotationY: 1 })],
      ),
    ).toBe(false)
  })

  it('updateFurniturePositionInHistory updates history when the position changes', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])

    const nextHistory = updateFurniturePositionInHistory(
      history,
      'item-1',
      [3, 0, 4],
    )

    expect(nextHistory).not.toBe(history)
    expect(nextHistory.present[0]?.position).toEqual([3, 0, 4])
  })

  it('updateFurniturePositionInHistory returns unchanged history for same position', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1', { position: [3, 0, 4] }),
    ])

    const nextHistory = updateFurniturePositionInHistory(
      history,
      'item-1',
      [3, 0, 4],
    )

    expect(nextHistory).toBe(history)
  })

  it('rotateSelectedFurnitureInHistory keeps history unchanged when selectedId is null', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])

    const nextHistory = rotateSelectedFurnitureInHistory({
      history,
      selectedId: null,
      deltaRadians: Math.PI / 2,
      bounds: ROTATE_BOUNDS,
    })

    expect(nextHistory).toBe(history)
  })

  it('rotateSelectedFurnitureInHistory keeps history unchanged when selected item is missing', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])

    const nextHistory = rotateSelectedFurnitureInHistory({
      history,
      selectedId: 'missing-id',
      deltaRadians: Math.PI / 2,
      bounds: ROTATE_BOUNDS,
    })

    expect(nextHistory).toBe(history)
  })

  it('rotateSelectedFurnitureInHistory keeps history unchanged when layout resolution fails', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])
    layoutMocks.resolveRotatedFurnitureTransform.mockReturnValueOnce(null)

    const nextHistory = rotateSelectedFurnitureInHistory({
      history,
      selectedId: 'item-1',
      deltaRadians: Math.PI / 2,
      bounds: ROTATE_BOUNDS,
    })

    expect(nextHistory).toBe(history)
  })

  it('rotateSelectedFurnitureInHistory commits a new entry when rotation resolves', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])

    const nextHistory = rotateSelectedFurnitureInHistory({
      history,
      selectedId: 'item-1',
      deltaRadians: Math.PI / 2,
      bounds: ROTATE_BOUNDS,
    })

    expect(nextHistory.past).toHaveLength(1)
    expect(nextHistory.present[0]?.position).toEqual([2, 0, 2])
    expect(nextHistory.present[0]?.rotationY).toBeCloseTo(Math.PI / 2)
  })

  it('addFurnitureToHistory returns unknown-catalog result without incrementing id', () => {
    const options = defaultAddOptions({ catalogId: 'missing-catalog' })

    const outcome = addFurnitureToHistory(options)

    expect(outcome).toEqual({
      history: options.history,
      result: {
        ok: false,
        reason: 'unknown-catalog',
      },
      incrementInstanceId: false,
    })
  })

  it('addFurnitureToHistory returns no-space result without incrementing id', () => {
    spawnMocks.findFurnitureSpawnPosition.mockReturnValueOnce(null)

    const outcome = addFurnitureToHistory(defaultAddOptions())

    expect(outcome.result).toEqual({
      ok: false,
      reason: 'no-space',
    })
    expect(outcome.incrementInstanceId).toBe(false)
  })

  it('addFurnitureToHistory adds spawned furniture and increments id on success', () => {
    const options = defaultAddOptions({ nextId: 'furniture-instance-22' })

    const outcome = addFurnitureToHistory(options)

    expect(outcome.result).toEqual({
      ok: true,
      id: 'furniture-instance-22',
    })
    expect(outcome.incrementInstanceId).toBe(true)
    expect(outcome.history.present).toHaveLength(1)
    expect(outcome.history.present[0]).toMatchObject({
      id: 'furniture-instance-22',
      catalogId: CATALOG_ENTRY.id,
      position: [1, 0, 1],
    })
  })

  it('deleteSelectionFromHistory handles null selection and missing ids', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])

    expect(deleteSelectionFromHistory(history, null)).toEqual({
      history,
      deleted: false,
      deletedId: null,
    })

    expect(deleteSelectionFromHistory(history, 'missing-id')).toEqual({
      history,
      deleted: false,
      deletedId: null,
    })
  })

  it('deleteSelectionFromHistory removes selected item and reports deleted metadata', () => {
    const history = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
      createFurnitureItem('item-2'),
    ])

    const outcome = deleteSelectionFromHistory(history, 'item-2')

    expect(outcome.deleted).toBe(true)
    expect(outcome.deletedId).toBe('item-2')
    expect(outcome.history.present).toHaveLength(1)
    expect(outcome.history.present[0]?.id).toBe('item-1')
  })
})
