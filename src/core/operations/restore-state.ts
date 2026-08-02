import { plural } from '@lingui/core/macro'
import { createDefaultSceneState } from '@/domain/scene-defaults'
import { isSceneStateAtDefaults } from '@/domain/scene-model'
import { getOutOfBoundsItemIds } from '@/domain/geometry/furniture-layout'
import {
  clampRoomSize,
  DEFAULT_ROOM_SIZE,
  getRoomLayoutBounds,
  type RoomSize,
} from '@/domain/geometry/room-metrics'
import { useAssetsStore } from '@/core/stores/assets-store'
import { feedback } from '@/core/stores/feedback-store'
import {
  getItems,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import { restoreInitialLayout } from './history-mutations'
import { saveSceneDraft } from '@/core/persistence/scene-draft'
import { roundRoomSize } from '@/core/persistence/scene-payload'
import type { RestorableState } from './restore-flow'

/** The catalog and finish vocabulary a restorable state is resolved against. */
export interface FinishContext {
  catalog: ReturnType<typeof useAssetsStore.getState>['catalog']
  defaultFloorFinishId: string
  defaultWallFinishId: string
  defaultLightingMoodId: string
  floorFinishIds: string[]
  wallFinishIds: string[]
  lightingMoodIds: string[]
}

export function resolveFinishContext(): FinishContext {
  const { catalog, environmentConfig } = useAssetsStore.getState()

  return {
    catalog,
    defaultFloorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
    defaultWallFinishId: environmentConfig?.defaultWallFinishId ?? '',
    defaultLightingMoodId: environmentConfig?.defaultLightingMoodId ?? '',
    floorFinishIds:
      environmentConfig?.floorFinishes.map((option) => option.id) ?? [],
    wallFinishIds:
      environmentConfig?.wallFinishes.map((option) => option.id) ?? [],
    lightingMoodIds:
      environmentConfig?.lightingMoods.map((option) => option.id) ?? [],
  }
}

/** A restorable state after normalization: the room size always resolved. */
type NormalizedRestorableState = RestorableState & { roomSize: RoomSize }

/**
 * Coerces each finish id to itself when known, else the environment default,
 * and the room size into its limits (or the default when absent).
 */
export function normalizeRestorableState(
  state: RestorableState,
  context: FinishContext,
): NormalizedRestorableState {
  return {
    ...state,
    floorFinishId: context.floorFinishIds.includes(state.floorFinishId ?? '')
      ? state.floorFinishId
      : context.defaultFloorFinishId,
    wallFinishId: context.wallFinishIds.includes(state.wallFinishId ?? '')
      ? state.wallFinishId
      : context.defaultWallFinishId,
    lightingMoodId: context.lightingMoodIds.includes(state.lightingMoodId ?? '')
      ? state.lightingMoodId
      : context.defaultLightingMoodId,
    roomSize: state.roomSize
      ? clampRoomSize(roundRoomSize(state.roomSize))
      : DEFAULT_ROOM_SIZE,
  }
}

/**
 * Applies a restorable state to the document: layout, known finish ids, and
 * the persisted draft, all from the same normalized snapshot.
 */
export function applyRestorableState(
  state: RestorableState,
  context: FinishContext,
) {
  const normalized = normalizeRestorableState(state, context)

  // Layout first: it is the step that can throw, and the restore flow's
  // fallback branches must not inherit this payload's room size.
  restoreInitialLayout(normalized.items)
  sceneDocumentActions.setRoomSize(normalized.roomSize)

  if (
    normalized.floorFinishId &&
    context.floorFinishIds.includes(normalized.floorFinishId)
  ) {
    sceneDocumentActions.setFloorFinishId(normalized.floorFinishId)
  }

  if (
    normalized.wallFinishId &&
    context.wallFinishIds.includes(normalized.wallFinishId)
  ) {
    sceneDocumentActions.setWallFinishId(normalized.wallFinishId)
  }

  if (
    normalized.lightingMoodId &&
    context.lightingMoodIds.includes(normalized.lightingMoodId)
  ) {
    sceneDocumentActions.setLightingMoodId(normalized.lightingMoodId)
  }

  saveSceneDraft(normalized.items, {
    floorFinishId: normalized.floorFinishId,
    wallFinishId: normalized.wallFinishId,
    lightingMoodId: normalized.lightingMoodId,
    roomSize: normalized.roomSize,
  })

  // Restore is verbatim - furniture that does not fit the stored room size
  // keeps its saved position - so the mismatch is worth a warning. The
  // rebuilt items carry the footprints, so the check reads the store.
  const outOfBoundsCount = getOutOfBoundsItemIds(
    getItems(),
    getRoomLayoutBounds(normalized.roomSize),
  ).length

  if (outOfBoundsCount > 0) {
    feedback.actionWarning({
      title: plural(outOfBoundsCount, {
        one: '# item is outside the room walls.',
        other: '# items are outside the room walls.',
      }),
    })
  }
}

/** Whether the state, once normalized, matches the environment's defaults. */
export function isRestorableStateAtDefaults(
  state: RestorableState,
  context: FinishContext,
): boolean {
  const normalized = normalizeRestorableState(state, context)

  return isSceneStateAtDefaults(
    {
      items: normalized.items,
      floorFinishId: normalized.floorFinishId,
      wallFinishId: normalized.wallFinishId,
      lightingMoodId: normalized.lightingMoodId,
      roomSize: normalized.roomSize,
    },
    createDefaultSceneState({
      defaultFloorFinishId: context.defaultFloorFinishId,
      defaultWallFinishId: context.defaultWallFinishId,
      defaultLightingMoodId: context.defaultLightingMoodId,
    }),
  )
}
