import { createDefaultSceneState } from '@/domain/scene-defaults'
import { isSceneStateAtDefaults } from '@/domain/scene-model'
import { useAssetsStore } from '@/core/stores/assets-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { restoreInitialLayout } from './history-mutations'
import { saveSceneDraft } from '@/core/persistence/scene-draft'
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

/** Coerces each finish id to itself when known, else the environment default. */
export function normalizeRestorableState(
  state: RestorableState,
  context: FinishContext,
): RestorableState {
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

  restoreInitialLayout(normalized.items)

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
  })
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
    },
    createDefaultSceneState({
      defaultFloorFinishId: context.defaultFloorFinishId,
      defaultWallFinishId: context.defaultWallFinishId,
      defaultLightingMoodId: context.defaultLightingMoodId,
    }),
  )
}
