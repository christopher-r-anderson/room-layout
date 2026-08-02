import type { FurnitureCatalogEntry } from '@/domain/catalog'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'
import type { RoomSize } from '@/domain/geometry/room-metrics'
import {
  hasValidOptionalRoomSize,
  isValidFurnitureInstance,
  roundTo3,
  toPersistedRoomSize,
} from './furniture-serialization'

export const SCENE_URL_PARAM = 'scene'
export const SCENE_URL_MAX_ENCODED_LENGTH = 4000
const SCENE_URL_VERSION = 1

// ---------------------------------------------------------------------------
// V1 payload shape
// ---------------------------------------------------------------------------

interface SceneUrlPayloadV1 {
  v: 1
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
  roomSize?: RoomSize
}

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

type ParseSceneUrlOutcome =
  | 'no-param'
  | 'duplicate-param'
  | 'over-limit'
  | 'decode-error'
  | 'invalid-schema'

export type ParseSceneUrlResult =
  | {
      ok: true
      items: FurnitureInstance[]
      floorFinishId?: string
      wallFinishId?: string
      lightingMoodId?: string
      roomSize?: RoomSize
    }
  | { ok: false; reason: ParseSceneUrlOutcome }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidScenePayloadV1(value: unknown): value is SceneUrlPayloadV1 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.v !== SCENE_URL_VERSION) return false
  if (!Array.isArray(v.items)) return false
  if (!v.items.every(isValidFurnitureInstance)) return false
  // Duplicate IDs would collide in the scene object map and corrupt lookups.
  // Safe: every item passed isValidFurnitureInstance which checks id is string.
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

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/**
 * Serializes the current scene items into the shared URL, replacing any
 * existing `scene` param and preserving other query params and the hash.
 *
 * Returns null if the encoded payload would exceed SCENE_URL_MAX_ENCODED_LENGTH.
 */
export function serializeSceneToUrl(
  items: FurnitureItem[],
  href: string,
  options?: {
    floorFinishId?: string
    wallFinishId?: string
    lightingMoodId?: string
    roomSize?: RoomSize
  },
): string | null {
  const sortedItems: FurnitureInstance[] = [...items]
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

  const payload: SceneUrlPayloadV1 = {
    v: SCENE_URL_VERSION,
    items: sortedItems,
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

  const jsonString = JSON.stringify(payload)

  if (encodeURIComponent(jsonString).length > SCENE_URL_MAX_ENCODED_LENGTH) {
    return null
  }

  const url = new URL(href)
  url.searchParams.set(SCENE_URL_PARAM, jsonString)
  return url.toString()
}

/**
 * Returns the provided URL without any `scene` query params, preserving all
 * other query params and the hash.
 */
export function removeSceneParamFromUrl(href: string): string {
  const url = new URL(href)

  while (url.searchParams.has(SCENE_URL_PARAM)) {
    url.searchParams.delete(SCENE_URL_PARAM)
  }

  return url.toString()
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses and structurally validates the `scene` query parameter from the
 * given URL string. Does NOT validate catalog references — the caller must
 * check those separately once the catalog is loaded.
 */
export function parseSceneUrl(href: string): ParseSceneUrlResult {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return { ok: false, reason: 'decode-error' }
  }

  const allValues = url.searchParams.getAll(SCENE_URL_PARAM)

  if (allValues.length === 0) {
    return { ok: false, reason: 'no-param' }
  }

  if (allValues.length > 1) {
    return { ok: false, reason: 'duplicate-param' }
  }

  const jsonString = allValues[0]

  // Check encoded length against the wire-format limit.
  if (encodeURIComponent(jsonString).length > SCENE_URL_MAX_ENCODED_LENGTH) {
    return { ok: false, reason: 'over-limit' }
  }

  let payload: unknown
  try {
    payload = JSON.parse(jsonString)
  } catch {
    return { ok: false, reason: 'decode-error' }
  }

  if (!isValidScenePayloadV1(payload)) {
    return { ok: false, reason: 'invalid-schema' }
  }

  return {
    ok: true,
    items: payload.items,
    floorFinishId: payload.floorFinishId,
    wallFinishId: payload.wallFinishId,
    lightingMoodId: payload.lightingMoodId,
    roomSize: payload.roomSize,
  }
}

// ---------------------------------------------------------------------------
// Catalog reference validation
// ---------------------------------------------------------------------------

/**
 * Returns true if every item's catalogId is present in the loaded catalog.
 * Call this after `parseSceneUrl` succeeds and the catalog is available.
 */
export function validateCatalogReferences(
  items: FurnitureInstance[],
  catalog: FurnitureCatalogEntry[],
): boolean {
  const catalogIds = new Set(catalog.map((e) => e.id))
  return items.every((item) => catalogIds.has(item.catalogId))
}
