import type { FurnitureInstance } from '@/scene/objects/furniture.types'
import { loadJsonWithDefault, removeKey, saveJson } from '@/lib/ui/storage'
import {
  isValidFurnitureInstance,
  roundTo3,
} from '@/lib/furniture-serialization'

const SCENE_DRAFT_STORAGE_KEY = 'scene-draft'
const SCENE_DRAFT_VERSION = 1

interface SceneDraftPayloadV1 {
  version: 1
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
}

export interface SceneDraftState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
}

function isValidSceneDraftPayload(
  value: unknown,
): value is SceneDraftPayloadV1 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>

  if (v.version !== SCENE_DRAFT_VERSION) return false
  if (!Array.isArray(v.items) || !v.items.every(isValidFurnitureInstance)) {
    return false
  }

  const ids = v.items.map((item) => item.id)
  if (new Set(ids).size !== ids.length) return false

  if ('floorFinishId' in v) {
    if (typeof v.floorFinishId !== 'string' || v.floorFinishId.length === 0) {
      return false
    }
  }

  if ('wallFinishId' in v) {
    if (typeof v.wallFinishId !== 'string' || v.wallFinishId.length === 0) {
      return false
    }
  }

  return true
}

export function saveSceneDraft(
  items: FurnitureInstance[],
  options?: { floorFinishId?: string; wallFinishId?: string },
): void {
  const normalizedItems: FurnitureInstance[] = [...items]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      id: item.id,
      catalogId: item.catalogId,
      position: [
        roundTo3(item.position[0]),
        roundTo3(item.position[1]),
        roundTo3(item.position[2]),
      ] as [number, number, number],
      rotationY: roundTo3(item.rotationY),
    }))

  const payload: SceneDraftPayloadV1 = {
    version: SCENE_DRAFT_VERSION,
    items: normalizedItems,
  }

  if (options?.floorFinishId) {
    payload.floorFinishId = options.floorFinishId
  }

  if (options?.wallFinishId) {
    payload.wallFinishId = options.wallFinishId
  }

  saveJson(SCENE_DRAFT_STORAGE_KEY, payload)
}

export function loadSceneDraft(): SceneDraftState | null {
  const parsed = loadJsonWithDefault<SceneDraftPayloadV1 | null>(
    SCENE_DRAFT_STORAGE_KEY,
    null,
    (value): value is SceneDraftPayloadV1 => isValidSceneDraftPayload(value),
  )

  if (!parsed) {
    return null
  }

  return {
    items: parsed.items,
    floorFinishId: parsed.floorFinishId,
    wallFinishId: parsed.wallFinishId,
  }
}

export function clearSceneDraft(): void {
  removeKey(SCENE_DRAFT_STORAGE_KEY)
}
