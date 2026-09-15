import { beforeEach, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { DEFAULT_ROOM_SIZE } from '@/domain/geometry/room-metrics'
import { makeFurnitureItem } from '@/test/support/furniture'
import {
  applyRestorableState,
  isRestorableStateAtDefaults,
  normalizeRestorableState,
  type FinishContext,
} from './restore-state'
import { restoreInitialLayout } from './history-mutations'
import { saveSceneDraft } from '@/core/persistence/scene-draft'
import { appToastManager } from '@/core/stores/feedback-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import type { FurnitureInstance } from '@/domain/furniture'

vi.mock('./history-mutations', () => ({
  restoreInitialLayout: vi.fn(),
}))

vi.mock('@/core/persistence/scene-draft', () => ({
  saveSceneDraft: vi.fn(),
}))

const CONTEXT: FinishContext = {
  catalog: [],
  defaultFloorFinishId: 'floor-default',
  defaultWallFinishId: 'wall-default',
  defaultLightingMoodId: 'mood-default',
  floorFinishIds: ['floor-default', 'floor-oak'],
  wallFinishIds: ['wall-default', 'wall-green'],
  lightingMoodIds: ['mood-default', 'mood-dusk'],
}

const ITEM: FurnitureInstance = {
  id: 'chair-instance-1',
  catalogId: 'chair',
  position: [1, 0, 2],
  rotationY: 0,
}

beforeEach(() => {
  resetSceneDocumentStore()
  vi.clearAllMocks()
})

it('keeps known finish ids and falls back to defaults for unknown ones', () => {
  const normalized = normalizeRestorableState(
    {
      items: [ITEM],
      floorFinishId: 'floor-oak',
      wallFinishId: 'wall-from-a-newer-manifest',
      lightingMoodId: undefined,
    },
    CONTEXT,
  )

  expect(normalized.floorFinishId).toBe('floor-oak')
  expect(normalized.wallFinishId).toBe('wall-default')
  expect(normalized.lightingMoodId).toBe('mood-default')
  expect(normalized.items).toEqual([ITEM])
})

it('applies layout, finishes, and the persisted draft from one normalized snapshot', () => {
  applyRestorableState(
    {
      items: [ITEM],
      floorFinishId: 'floor-oak',
      wallFinishId: 'wall-unknown',
      lightingMoodId: 'mood-dusk',
    },
    CONTEXT,
  )

  expect(restoreInitialLayout).toHaveBeenCalledWith([ITEM])
  const documentState = useSceneDocumentStore.getState()
  expect(documentState.floorFinishId).toBe('floor-oak')
  expect(documentState.wallFinishId).toBe('wall-default')
  expect(documentState.lightingMoodId).toBe('mood-dusk')
  expect(saveSceneDraft).toHaveBeenCalledWith([ITEM], {
    floorFinishId: 'floor-oak',
    wallFinishId: 'wall-default',
    lightingMoodId: 'mood-dusk',
    roomSize: DEFAULT_ROOM_SIZE,
  })
})

it('clamps a stored room size into limits and defaults an absent one', () => {
  expect(
    normalizeRestorableState(
      { items: [], roomSize: { width: 1, depth: 30, height: 2.5004 } },
      CONTEXT,
    ).roomSize,
  ).toEqual({ width: 2, depth: 20, height: 2.5 })

  expect(normalizeRestorableState({ items: [] }, CONTEXT).roomSize).toEqual(
    DEFAULT_ROOM_SIZE,
  )
})

it('applies the stored room size and warns when restored items fall outside it', () => {
  const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')
  // restoreInitialLayout is mocked, so seed the rebuilt items directly: one
  // outside the 4x4 room, one inside.
  sceneDocumentActions.setHistory(
    createHistoryState([
      makeFurnitureItem({ id: 'outside', position: [10, 0, 0] }),
      makeFurnitureItem({ id: 'inside', position: [0, 0, 0] }),
    ]),
  )

  applyRestorableState(
    { items: [ITEM], roomSize: { width: 4, depth: 4, height: 2.5 } },
    CONTEXT,
  )

  expect(useSceneDocumentStore.getState().roomSize).toEqual({
    width: 4,
    depth: 4,
    height: 2.5,
  })
  expect(addToast).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'warning',
      title: '1 item is outside the room walls.',
    }),
  )
})

it('leaves the room size untouched when the layout restore throws', () => {
  vi.mocked(restoreInitialLayout).mockImplementationOnce(() => {
    throw new Error('broken payload')
  })

  expect(() => {
    applyRestorableState(
      { items: [ITEM], roomSize: { width: 4, depth: 4, height: 2.5 } },
      CONTEXT,
    )
  }).toThrow('broken payload')

  expect(useSceneDocumentStore.getState().roomSize).toEqual(DEFAULT_ROOM_SIZE)
})

it('does not warn when every restored item fits the stored room size', () => {
  const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')
  sceneDocumentActions.setHistory(
    createHistoryState([makeFurnitureItem({ position: [0, 0, 0] })]),
  )

  applyRestorableState({ items: [ITEM] }, CONTEXT)

  expect(addToast).not.toHaveBeenCalled()
})

it('skips finish writes when the environment has no vocabulary for them', () => {
  const emptyContext: FinishContext = {
    ...CONTEXT,
    defaultFloorFinishId: '',
    defaultWallFinishId: '',
    defaultLightingMoodId: '',
    floorFinishIds: [],
    wallFinishIds: [],
    lightingMoodIds: [],
  }
  const before = useSceneDocumentStore.getState()

  applyRestorableState({ items: [ITEM] }, emptyContext)

  const after = useSceneDocumentStore.getState()
  expect(after.floorFinishId).toBe(before.floorFinishId)
  expect(after.wallFinishId).toBe(before.wallFinishId)
  expect(after.lightingMoodId).toBe(before.lightingMoodId)
})

it('treats an empty layout with default (or normalized-to-default) finishes as fresh', () => {
  expect(
    isRestorableStateAtDefaults(
      { items: [], floorFinishId: 'floor-from-a-newer-manifest' },
      CONTEXT,
    ),
  ).toBe(true)

  expect(isRestorableStateAtDefaults({ items: [ITEM] }, CONTEXT)).toBe(false)
  expect(
    isRestorableStateAtDefaults(
      { items: [], roomSize: { width: 4, depth: 6, height: 2.5 } },
      CONTEXT,
    ),
  ).toBe(false)
  expect(
    isRestorableStateAtDefaults(
      { items: [], roomSize: DEFAULT_ROOM_SIZE },
      CONTEXT,
    ),
  ).toBe(true)
  expect(
    isRestorableStateAtDefaults(
      { items: [], floorFinishId: 'floor-oak' },
      CONTEXT,
    ),
  ).toBe(false)
})
