import type { FurnitureInstance } from '@/domain/furniture'
import {
  isDefaultRoomSize,
  type RoomSize,
} from '@/domain/geometry/room-metrics'

/**
 * The scene fields every persistence envelope shares; each envelope adds only
 * its own version key (draft `version`, URL `v`) and transport rules.
 */
export interface ScenePayloadFields {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
  roomSize?: RoomSize
}

export type ScenePayloadOptions = Omit<ScenePayloadFields, 'items'>

/** Rounds to 3 decimals via toFixed, avoiding intermediate arithmetic error. */
export function roundTo3(n: number): number {
  return parseFloat(n.toFixed(3))
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value)
}

/**
 * Structural check only - catalog references are validated separately, once
 * the catalog is loaded.
 */
export function isValidFurnitureInstance(
  value: unknown,
): value is FurnitureInstance {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (typeof v.catalogId !== 'string' || v.catalogId.length === 0) return false
  if (!isFiniteNumber(v.rotationY)) return false
  if (
    !Array.isArray(v.position) ||
    v.position.length !== 3 ||
    !v.position.every(isFiniteNumber)
  )
    return false
  return true
}

// Finite positive dimensions only: range limits are load-time policy (the
// restore normalize clamps), not a schema concern.
function isValidRoomSizePayload(value: unknown): value is RoomSize {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>

  return (
    isFiniteNumber(v.width) &&
    v.width > 0 &&
    isFiniteNumber(v.depth) &&
    v.depth > 0 &&
    isFiniteNumber(v.height) &&
    v.height > 0
  )
}

export function roundRoomSize(size: RoomSize): RoomSize {
  return {
    width: roundTo3(size.width),
    depth: roundTo3(size.depth),
    height: roundTo3(size.height),
  }
}

// Omitted at the default so unresized payloads stay byte-identical.
function toPersistedRoomSize(size: RoomSize | undefined): RoomSize | undefined {
  return !size || isDefaultRoomSize(size) ? undefined : roundRoomSize(size)
}

function hasValidOptionalId(
  value: Record<string, unknown>,
  key: 'floorFinishId' | 'wallFinishId' | 'lightingMoodId',
): boolean {
  if (!(key in value)) return true
  const id = value[key]
  return typeof id === 'string' && id.length > 0
}

/**
 * Validates the shared fields of a decoded payload; the caller checks its own
 * envelope's version key. Duplicate item ids are rejected because they would
 * collide in the scene object map and corrupt lookups.
 */
export function hasValidScenePayloadFields(
  value: Record<string, unknown>,
): boolean {
  if (
    !Array.isArray(value.items) ||
    !value.items.every(isValidFurnitureInstance)
  ) {
    return false
  }

  const ids = value.items.map((item) => item.id)
  if (new Set(ids).size !== ids.length) return false

  return (
    hasValidOptionalId(value, 'floorFinishId') &&
    hasValidOptionalId(value, 'wallFinishId') &&
    hasValidOptionalId(value, 'lightingMoodId') &&
    (!('roomSize' in value) || isValidRoomSizePayload(value.roomSize))
  )
}

/**
 * Normalizes for persistence: items sorted by id with transforms rounded to
 * 3 decimals, optional fields present only when set (room size omitted at the
 * default).
 */
export function toScenePayloadFields(
  items: FurnitureInstance[],
  options?: ScenePayloadOptions,
): ScenePayloadFields {
  const fields: ScenePayloadFields = {
    items: [...items]
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
      })),
  }

  if (options?.floorFinishId) {
    fields.floorFinishId = options.floorFinishId
  }

  if (options?.wallFinishId) {
    fields.wallFinishId = options.wallFinishId
  }

  if (options?.lightingMoodId) {
    fields.lightingMoodId = options.lightingMoodId
  }

  const roomSize = toPersistedRoomSize(options?.roomSize)

  if (roomSize) {
    fields.roomSize = roomSize
  }

  return fields
}

/** The shared fields of a validated payload, without its envelope key. */
export function pickScenePayloadFields(
  payload: ScenePayloadFields,
): ScenePayloadFields {
  return {
    items: payload.items,
    floorFinishId: payload.floorFinishId,
    wallFinishId: payload.wallFinishId,
    lightingMoodId: payload.lightingMoodId,
    roomSize: payload.roomSize,
  }
}
