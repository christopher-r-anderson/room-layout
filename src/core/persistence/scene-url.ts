import type { FurnitureCatalogEntry } from '@/domain/catalog'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'
import {
  hasValidScenePayloadFields,
  pickScenePayloadFields,
  toScenePayloadFields,
  type ScenePayloadFields,
  type ScenePayloadOptions,
} from './scene-payload'

export const SCENE_URL_PARAM = 'scene'
export const SCENE_URL_MAX_ENCODED_LENGTH = 4000
const SCENE_URL_VERSION = 1

type SceneUrlPayloadV1 = ScenePayloadFields & { v: 1 }

type ParseSceneUrlOutcome =
  | 'no-param'
  | 'duplicate-param'
  | 'over-limit'
  | 'decode-error'
  | 'invalid-schema'

export type ParseSceneUrlResult =
  | ({ ok: true } & ScenePayloadFields)
  | { ok: false; reason: ParseSceneUrlOutcome }

function isValidScenePayloadV1(value: unknown): value is SceneUrlPayloadV1 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>

  return v.v === SCENE_URL_VERSION && hasValidScenePayloadFields(v)
}

/**
 * Serializes the current scene items into the shared URL, replacing any
 * existing `scene` param and preserving other query params and the hash.
 *
 * Returns null if the encoded payload would exceed SCENE_URL_MAX_ENCODED_LENGTH.
 */
export function serializeSceneToUrl(
  items: FurnitureItem[],
  href: string,
  options?: ScenePayloadOptions,
): string | null {
  const payload: SceneUrlPayloadV1 = {
    v: SCENE_URL_VERSION,
    ...toScenePayloadFields(items, options),
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

/**
 * Parses and structurally validates the `scene` query parameter from the
 * given URL string. Does NOT validate catalog references - the caller must
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

  return { ok: true, ...pickScenePayloadFields(payload) }
}

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
