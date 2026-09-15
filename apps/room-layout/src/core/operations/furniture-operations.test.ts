import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  createHistoryState,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import type { CollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import {
  addFurnitureToHistory,
  areFurnitureCollectionsEqual,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
  resolveMoveSelectionInHistory,
  resolveSetSelectionTransformInHistory,
  rotateSelectedFurnitureInHistory,
  updateFurniturePositionInHistory,
} from './furniture-operations'

const spawnMocks = vi.hoisted(() => ({
  findFurnitureSpawnPosition: vi.fn(),
}))

const layoutMocks = vi.hoisted(() => ({
  resolveRotatedFurnitureTransform: vi.fn(),
}))

vi.mock('@/domain/geometry/furniture-spawn', () => ({
  findFurnitureSpawnPosition: spawnMocks.findFurnitureSpawnPosition,
}))

vi.mock('@/domain/geometry/furniture-layout', async () => {
  const actual = await vi.importActual<
    typeof import('@/domain/geometry/furniture-layout')
  >('@/domain/geometry/furniture-layout')

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
  previewPath: '/catalog-previews/couch.webp',
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

function defaultAddOptions(
  overrides?: Partial<{
    history: HistoryState<FurnitureItem[]>
    catalogId: string
    nextId: string
    edgeSnapThreshold: number
    snapSize: number
  }>,
) {
  // The couch node sits at the origin with no rotation.
  const nodeDefaultsByPath = new Map([
    [
      SOURCE_PATH,
      new Map<string, CollectionNodeDefaults>([
        [CATALOG_ENTRY.nodeName, { position: [0, 0, 0], rotationY: 0 }],
      ]),
    ],
  ])

  return {
    history: createHistoryState<FurnitureItem[]>([]),
    catalogId: CATALOG_ENTRY.id,
    nextId: 'furniture-instance-1',
    catalog: [CATALOG_ENTRY],
    collections: [{ id: CATALOG_ENTRY.collectionId, sourcePath: SOURCE_PATH }],
    bounds: {
      minX: -5,
      maxX: 5,
      minZ: -5,
      maxZ: 5,
    },
    edgeSnapThreshold: 0.5,
    snapSize: 0.25,
    nodeDefaultsByPath,
    ...overrides,
  }
}

describe('furniture-operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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

describe('resolveMoveSelectionInHistory', () => {
  // 2x1 footprint (from createFurnitureItem) spans ±1 in X, ±0.5 in Z.
  const baseArgs = {
    isDragging: false,
    delta: { x: 1, z: 0 },
    bounds: ROTATE_BOUNDS,
    edgeSnapThreshold: 0,
  }

  it('refuses to move while a drag is in progress', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    const outcome = resolveMoveSelectionInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      isDragging: true,
    })

    expect(outcome.result).toEqual({ ok: false, reason: 'dragging' })
    expect(outcome.history).toBe(history)
  })

  it('reports no-selection without a selected id or a missing item', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    expect(
      resolveMoveSelectionInHistory({ ...baseArgs, history, selectedId: null })
        .result,
    ).toEqual({ ok: false, reason: 'no-selection' })
    expect(
      resolveMoveSelectionInHistory({
        ...baseArgs,
        history,
        selectedId: 'ghost',
      }).result,
    ).toEqual({ ok: false, reason: 'no-selection' })
  })

  it('commits a successful move and returns the resolved position', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    const outcome = resolveMoveSelectionInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      delta: { x: 1, z: 0 },
    })

    expect(outcome.result).toEqual({ ok: true, position: [1, 0, 0] })
    expect(outcome.history.present[0]?.position).toEqual([1, 0, 0])
    expect(outcome.history.past).toHaveLength(1)
  })

  it('reports blocked-collision when the move would overlap another item', () => {
    const history = createHistoryState([
      createFurnitureItem('item-1'),
      createFurnitureItem('item-2', { position: [3, 0, 0] }),
    ])

    const outcome = resolveMoveSelectionInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      delta: { x: 3, z: 0 },
    })

    expect(outcome.result).toEqual({ ok: false, reason: 'blocked-collision' })
    expect(outcome.history).toBe(history)
  })

  it('distinguishes a wall-blocked move from a no-op', () => {
    const atWall = createHistoryState([
      createFurnitureItem('item-1', { position: [4, 0, 0] }),
    ])

    // Pushing past the +X wall clamps back to the same spot -> blocked-bounds.
    expect(
      resolveMoveSelectionInHistory({
        ...baseArgs,
        history: atWall,
        selectedId: 'item-1',
        delta: { x: 1, z: 0 },
      }).result,
    ).toEqual({ ok: false, reason: 'blocked-bounds' })

    // A zero delta never moved anything -> no-op.
    expect(
      resolveMoveSelectionInHistory({
        ...baseArgs,
        history: atWall,
        selectedId: 'item-1',
        delta: { x: 0, z: 0 },
      }).result,
    ).toEqual({ ok: false, reason: 'no-op' })
  })
})

describe('resolveSetSelectionTransformInHistory', () => {
  const baseArgs = {
    isDragging: false,
    bounds: ROTATE_BOUNDS,
  }

  it('refuses to transform while a drag is in progress', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    const outcome = resolveSetSelectionTransformInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      isDragging: true,
      input: { position: [1, 0, 2] },
    })

    expect(outcome.result).toEqual({ ok: false, reason: 'dragging' })
    expect(outcome.history).toBe(history)
  })

  it('reports no-selection without a selected id or a missing item', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    expect(
      resolveSetSelectionTransformInHistory({
        ...baseArgs,
        history,
        selectedId: null,
        input: { position: [1, 0, 2] },
      }).result,
    ).toEqual({ ok: false, reason: 'no-selection' })
    expect(
      resolveSetSelectionTransformInHistory({
        ...baseArgs,
        history,
        selectedId: 'ghost',
        input: { position: [1, 0, 2] },
      }).result,
    ).toEqual({ ok: false, reason: 'no-selection' })
  })

  it('reports no-op when neither position nor rotation changes', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    const outcome = resolveSetSelectionTransformInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      input: {},
    })

    expect(outcome.result).toEqual({ ok: false, reason: 'no-op' })
    expect(outcome.history).toBe(history)
  })

  it('commits a valid transform and returns the updated item', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    const outcome = resolveSetSelectionTransformInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      input: { position: [1, 0, 2] },
    })

    expect(outcome.result.ok).toBe(true)
    expect(outcome.history.present[0]?.position).toEqual([1, 0, 2])
    expect(outcome.history.past).toHaveLength(1)
  })

  it('passes through a blocked-bounds rejection from the domain resolver', () => {
    const history = createHistoryState([createFurnitureItem('item-1')])

    const outcome = resolveSetSelectionTransformInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      input: { position: [10, 0, 0] },
    })

    expect(outcome.result).toEqual({ ok: false, reason: 'blocked-bounds' })
    expect(outcome.history).toBe(history)
  })

  it('passes through a blocked-collision rejection from the domain resolver', () => {
    const history = createHistoryState([
      createFurnitureItem('item-1'),
      createFurnitureItem('item-2', { position: [3, 0, 0] }),
    ])

    const outcome = resolveSetSelectionTransformInHistory({
      ...baseArgs,
      history,
      selectedId: 'item-1',
      input: { position: [3, 0, 0] },
    })

    expect(outcome.result).toEqual({ ok: false, reason: 'blocked-collision' })
    expect(outcome.history).toBe(history)
  })
})
