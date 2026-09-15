import type { FurnitureInstance } from '@/domain/furniture'
import {
  loadJsonWithDefault,
  removeKey,
  saveJson,
} from '@/shared/lib/ui/storage'
import {
  hasValidScenePayloadFields,
  pickScenePayloadFields,
  toScenePayloadFields,
  type ScenePayloadFields,
  type ScenePayloadOptions,
} from './scene-payload'

const SCENE_DRAFT_STORAGE_KEY = 'scene-draft'
const SCENE_DRAFT_VERSION = 1

type SceneDraftPayloadV1 = ScenePayloadFields & { version: 1 }

export type SceneDraftState = ScenePayloadFields

function isValidSceneDraftPayload(
  value: unknown,
): value is SceneDraftPayloadV1 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>

  return v.version === SCENE_DRAFT_VERSION && hasValidScenePayloadFields(v)
}

export function saveSceneDraft(
  items: FurnitureInstance[],
  options?: ScenePayloadOptions,
): void {
  const payload: SceneDraftPayloadV1 = {
    version: SCENE_DRAFT_VERSION,
    ...toScenePayloadFields(items, options),
  }

  saveJson(SCENE_DRAFT_STORAGE_KEY, payload)
}

export function loadSceneDraft(): SceneDraftState | null {
  const parsed = loadJsonWithDefault<SceneDraftPayloadV1 | null>(
    SCENE_DRAFT_STORAGE_KEY,
    null,
    (value): value is SceneDraftPayloadV1 => isValidSceneDraftPayload(value),
  )

  return parsed ? pickScenePayloadFields(parsed) : null
}

export function clearSceneDraft(): void {
  removeKey(SCENE_DRAFT_STORAGE_KEY)
}
