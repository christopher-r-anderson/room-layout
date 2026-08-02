import type { FurnitureInstance } from '@/domain/furniture'
import type { RoomSize } from '@/domain/geometry/room-metrics'
import {
  loadJsonWithDefault,
  removeKey,
  saveJson,
} from '@/shared/lib/ui/storage'
import {
  hasValidOptionalRoomSize,
  isValidFurnitureInstance,
  roundTo3,
  toPersistedRoomSize,
} from './furniture-serialization'

const SCENE_DRAFT_STORAGE_KEY = 'scene-draft'
const SCENE_DRAFT_VERSION = 1

interface SceneDraftPayloadV1 {
  version: 1
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
  roomSize?: RoomSize
}

export interface SceneDraftState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
  roomSize?: RoomSize
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

  if ('lightingMoodId' in v) {
    if (typeof v.lightingMoodId !== 'string' || v.lightingMoodId.length === 0) {
      return false
    }
  }

  if (!hasValidOptionalRoomSize(v)) {
    return false
  }

  return true
}

export function saveSceneDraft(
  items: FurnitureInstance[],
  options?: {
    floorFinishId?: string
    wallFinishId?: string
    lightingMoodId?: string
    roomSize?: RoomSize
  },
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

  if (options?.lightingMoodId) {
    payload.lightingMoodId = options.lightingMoodId
  }

  const persistedRoomSize = toPersistedRoomSize(options?.roomSize)

  if (persistedRoomSize) {
    payload.roomSize = persistedRoomSize
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
    lightingMoodId: parsed.lightingMoodId,
    roomSize: parsed.roomSize,
  }
}

export function clearSceneDraft(): void {
  removeKey(SCENE_DRAFT_STORAGE_KEY)
}
