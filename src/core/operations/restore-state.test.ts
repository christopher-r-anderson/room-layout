import { beforeEach, expect, it, vi } from 'vitest'
import {
  applyRestorableState,
  isRestorableStateAtDefaults,
  normalizeRestorableState,
  type FinishContext,
} from './restore-state'
import { restoreInitialLayout } from './history-mutations'
import { saveSceneDraft } from '@/core/persistence/scene-draft'
import {
  resetSceneDocumentStore,
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
  })
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
      { items: [], floorFinishId: 'floor-oak' },
      CONTEXT,
    ),
  ).toBe(false)
})
