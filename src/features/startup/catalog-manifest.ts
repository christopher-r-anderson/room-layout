import { resolvePublicAssetPath } from '@/shared/lib/asset-path'
import {
  type EnvironmentMaterialConfig,
  type FloorFinishOption,
  type WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import type { FurnitureKind } from '@/scene/objects/furniture.types'
import { createDevPerfLogger } from './perf-log'

const perfLog = createDevPerfLogger('📦')

// Adding a new kind here must be paired with updating the FurnitureKind union
// in src/scene/objects/furniture.types.ts.
const KNOWN_FURNITURE_KINDS: readonly FurnitureKind[] = [
  'armchair',
  'couch',
  'coffee-table',
  'end-table',
]

// The manifest JSON stores bare relative paths (e.g. "models/foo.glb").
// This parser resolves them to runtime paths via resolvePublicAssetPath.
// The TypeScript runtime types (FurnitureCatalogEntry, FurnitureCollection)
// always hold resolved paths; the JSON on disk never does.

export class ManifestNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestNetworkError'
  }
}

export class ManifestValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestValidationError'
  }
}

export interface CatalogManifestResult {
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  environment: EnvironmentMaterialConfig
}

interface FetchCatalogManifestOptions {
  signal?: AbortSignal
}

function normalizeRelativeAssetPath(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed === '') return null

  // Reject obvious non-relative forms before decoding.
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return null
  if (trimmed.startsWith('//') || trimmed.startsWith('/')) return null

  // Reject Windows separators and dangerous encoded separator/traversal tokens.
  if (trimmed.includes('\\')) return null
  if (/%2e|%2f|%5c/i.test(trimmed)) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    return null
  }

  if (decoded.includes('\\')) return null
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(decoded)) return null
  if (decoded.startsWith('//') || decoded.startsWith('/')) return null
  if (/%2e|%2f|%5c/i.test(decoded)) return null

  const rawSegments = decoded.split('/')

  if (
    rawSegments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return null
  }

  // Canonicalize to a consistent URL path representation.
  return rawSegments.map((segment) => encodeURIComponent(segment)).join('/')
}

function validateAndNormalizeCollection(
  raw: unknown,
  index: number,
): FurnitureCollection {
  if (typeof raw !== 'object' || raw === null) {
    throw new ManifestValidationError(
      `collections[${String(index)}]: must be an object`,
    )
  }

  const entry = raw as Record<string, unknown>

  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    throw new ManifestValidationError(
      `collections[${String(index)}]: "id" must be a non-empty string`,
    )
  }

  const normalizedModelPath = normalizeRelativeAssetPath(entry.modelPath)
  if (normalizedModelPath === null) {
    throw new ManifestValidationError(
      `collections[${String(index)}] ("${entry.id}"): "modelPath" must be a relative path`,
    )
  }

  return {
    id: entry.id,
    sourcePath: resolvePublicAssetPath(normalizedModelPath),
  }
}

function validateAndNormalizeCatalogEntry(
  raw: unknown,
  index: number,
  collectionIds: Set<string>,
): FurnitureCatalogEntry {
  if (typeof raw !== 'object' || raw === null) {
    throw new ManifestValidationError(
      `catalog[${String(index)}]: must be an object`,
    )
  }

  const entry = raw as Record<string, unknown>

  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    throw new ManifestValidationError(
      `catalog[${String(index)}]: "id" must be a non-empty string`,
    )
  }

  const id = entry.id

  if (typeof entry.name !== 'string' || entry.name.trim() === '') {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "name" must be a non-empty string`,
    )
  }

  if (
    typeof entry.kind !== 'string' ||
    !KNOWN_FURNITURE_KINDS.includes(entry.kind as FurnitureKind)
  ) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "kind" must be one of: ${KNOWN_FURNITURE_KINDS.join(', ')}`,
    )
  }

  if (
    typeof entry.collectionId !== 'string' ||
    !collectionIds.has(entry.collectionId)
  ) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "collectionId" must reference a defined collection`,
    )
  }

  if (typeof entry.nodeName !== 'string' || entry.nodeName.trim() === '') {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "nodeName" must be a non-empty string`,
    )
  }

  if (
    entry.uiBoundsNodeName !== undefined &&
    (typeof entry.uiBoundsNodeName !== 'string' ||
      entry.uiBoundsNodeName.trim() === '')
  ) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "uiBoundsNodeName" must be a non-empty string when provided`,
    )
  }

  if (typeof entry.footprintSize !== 'object' || entry.footprintSize === null) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "footprintSize" must be an object`,
    )
  }

  const footprint = entry.footprintSize as Record<string, unknown>

  const rawWidth = footprint.width
  const rawDepth = footprint.depth

  if (
    typeof rawWidth !== 'number' ||
    !Number.isFinite(rawWidth) ||
    rawWidth <= 0
  ) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "footprintSize.width" must be a positive finite number`,
    )
  }

  if (
    typeof rawDepth !== 'number' ||
    !Number.isFinite(rawDepth) ||
    rawDepth <= 0
  ) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "footprintSize.depth" must be a positive finite number`,
    )
  }

  const normalizedPreviewPath = normalizeRelativeAssetPath(entry.previewPath)
  if (normalizedPreviewPath === null) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "previewPath" must be a relative path`,
    )
  }

  return {
    id,
    name: entry.name,
    kind: entry.kind as FurnitureKind,
    collectionId: entry.collectionId,
    nodeName: entry.nodeName,
    ...(entry.uiBoundsNodeName
      ? { uiBoundsNodeName: entry.uiBoundsNodeName.trim() }
      : {}),
    footprintSize: {
      width: rawWidth,
      depth: rawDepth,
    },
    previewPath: resolvePublicAssetPath(normalizedPreviewPath),
  }
}

function parseHexColor(value: unknown, path: string): number {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new ManifestValidationError(
      `${path}: "color" must be a #RRGGBB string`,
    )
  }

  return Number.parseInt(value.slice(1), 16)
}

function normalizeOptionalPreviewPath(
  value: unknown,
  path: string,
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalizedPreviewPath = normalizeRelativeAssetPath(value)
  if (normalizedPreviewPath === null) {
    throw new ManifestValidationError(
      `${path}: "previewPath" must be a relative path`,
    )
  }

  return resolvePublicAssetPath(normalizedPreviewPath)
}

function validateAndNormalizeFloorFinish(
  raw: unknown,
  index: number,
): FloorFinishOption {
  if (typeof raw !== 'object' || raw === null) {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}]: must be an object`,
    )
  }

  const entry = raw as Record<string, unknown>

  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}]: "id" must be a non-empty string`,
    )
  }

  if (typeof entry.label !== 'string' || entry.label.trim() === '') {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}] ("${entry.id}"): "label" must be a non-empty string`,
    )
  }

  const normalizedDiffusePath = normalizeRelativeAssetPath(entry.diffusePath)
  if (normalizedDiffusePath === null) {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}] ("${entry.id}"): "diffusePath" must be a relative path`,
    )
  }

  const normalizedNormalPath = normalizeRelativeAssetPath(entry.normalPath)
  if (normalizedNormalPath === null) {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}] ("${entry.id}"): "normalPath" must be a relative path`,
    )
  }

  if (
    typeof entry.tileSizeMeters !== 'object' ||
    entry.tileSizeMeters === null
  ) {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}] ("${entry.id}"): "tileSizeMeters" must be an object`,
    )
  }

  const tileSizeMeters = entry.tileSizeMeters as Record<string, unknown>

  if (
    typeof tileSizeMeters.width !== 'number' ||
    !Number.isFinite(tileSizeMeters.width) ||
    tileSizeMeters.width <= 0
  ) {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}] ("${entry.id}"): "tileSizeMeters.width" must be a positive finite number`,
    )
  }

  if (
    typeof tileSizeMeters.depth !== 'number' ||
    !Number.isFinite(tileSizeMeters.depth) ||
    tileSizeMeters.depth <= 0
  ) {
    throw new ManifestValidationError(
      `environment.floorFinishes[${String(index)}] ("${entry.id}"): "tileSizeMeters.depth" must be a positive finite number`,
    )
  }

  const previewPath = normalizeOptionalPreviewPath(
    entry.previewPath,
    `environment.floorFinishes[${String(index)}] ("${entry.id}")`,
  )

  return {
    id: entry.id,
    label: entry.label,
    diffusePath: resolvePublicAssetPath(normalizedDiffusePath),
    normalPath: resolvePublicAssetPath(normalizedNormalPath),
    ...(previewPath ? { previewPath } : {}),
    tileSizeMeters: {
      width: tileSizeMeters.width,
      depth: tileSizeMeters.depth,
    },
  }
}

function validateAndNormalizeWallFinish(
  raw: unknown,
  index: number,
): WallFinishOption {
  if (typeof raw !== 'object' || raw === null) {
    throw new ManifestValidationError(
      `environment.wallFinishes[${String(index)}]: must be an object`,
    )
  }

  const entry = raw as Record<string, unknown>

  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    throw new ManifestValidationError(
      `environment.wallFinishes[${String(index)}]: "id" must be a non-empty string`,
    )
  }

  if (typeof entry.label !== 'string' || entry.label.trim() === '') {
    throw new ManifestValidationError(
      `environment.wallFinishes[${String(index)}] ("${entry.id}"): "label" must be a non-empty string`,
    )
  }

  if (entry.previewPath !== undefined) {
    throw new ManifestValidationError(
      `environment.wallFinishes[${String(index)}] ("${entry.id}"): "previewPath" is not supported; wall swatches are derived from "color"`,
    )
  }

  return {
    id: entry.id,
    label: entry.label,
    color: parseHexColor(
      entry.color,
      `environment.wallFinishes[${String(index)}] ("${entry.id}")`,
    ),
  }
}

function validateAndNormalizeEnvironment(
  raw: unknown,
): EnvironmentMaterialConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new ManifestValidationError(
      'Catalog manifest must have an "environment" object',
    )
  }

  const environment = raw as Record<string, unknown>

  if (!Array.isArray(environment.floorFinishes)) {
    throw new ManifestValidationError(
      'Catalog manifest environment must have a "floorFinishes" array',
    )
  }

  if (environment.floorFinishes.length === 0) {
    throw new ManifestValidationError(
      'Catalog manifest environment "floorFinishes" array must not be empty',
    )
  }

  if (!Array.isArray(environment.wallFinishes)) {
    throw new ManifestValidationError(
      'Catalog manifest environment must have a "wallFinishes" array',
    )
  }

  if (environment.wallFinishes.length === 0) {
    throw new ManifestValidationError(
      'Catalog manifest environment "wallFinishes" array must not be empty',
    )
  }

  const floorFinishes = environment.floorFinishes.map((rawFloor, i) =>
    validateAndNormalizeFloorFinish(rawFloor, i),
  )
  const wallFinishes = environment.wallFinishes.map((rawWall, i) =>
    validateAndNormalizeWallFinish(rawWall, i),
  )

  const floorIds = new Set<string>()
  for (const option of floorFinishes) {
    if (floorIds.has(option.id)) {
      throw new ManifestValidationError(
        `environment.floorFinishes: duplicate id "${option.id}"`,
      )
    }
    floorIds.add(option.id)
  }

  const wallIds = new Set<string>()
  for (const option of wallFinishes) {
    if (wallIds.has(option.id)) {
      throw new ManifestValidationError(
        `environment.wallFinishes: duplicate id "${option.id}"`,
      )
    }
    wallIds.add(option.id)
  }

  const defaultFloorFinishIdCandidate =
    typeof environment.defaultFloorFinishId === 'string'
      ? environment.defaultFloorFinishId
      : floorFinishes[0].id

  const defaultWallFinishIdCandidate =
    typeof environment.defaultWallFinishId === 'string'
      ? environment.defaultWallFinishId
      : wallFinishes[0].id

  if (!floorIds.has(defaultFloorFinishIdCandidate)) {
    throw new ManifestValidationError(
      'Catalog manifest environment "defaultFloorFinishId" must reference an existing floor finish id',
    )
  }

  if (!wallIds.has(defaultWallFinishIdCandidate)) {
    throw new ManifestValidationError(
      'Catalog manifest environment "defaultWallFinishId" must reference an existing wall finish id',
    )
  }

  return {
    floorFinishes,
    wallFinishes,
    defaultFloorFinishId: defaultFloorFinishIdCandidate,
    defaultWallFinishId: defaultWallFinishIdCandidate,
  }
}

export async function fetchCatalogManifest(
  manifestUrl = 'catalog-manifest.json',
  options: FetchCatalogManifestOptions = {},
): Promise<CatalogManifestResult> {
  perfLog('Fetching catalog manifest...')
  const fetchStartTime = performance.now()

  const normalizedManifestPath = normalizeRelativeAssetPath(manifestUrl)
  if (normalizedManifestPath === null) {
    throw new ManifestValidationError(
      'Catalog manifest URL must be a relative path',
    )
  }

  let response: Response

  try {
    const resolvedManifestUrl = resolvePublicAssetPath(normalizedManifestPath)
    if (options.signal) {
      response = await fetch(resolvedManifestUrl, { signal: options.signal })
    } else {
      response = await fetch(resolvedManifestUrl)
    }
  } catch (cause) {
    throw new ManifestNetworkError(
      `Failed to fetch catalog manifest: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
  }

  if (!response.ok) {
    throw new ManifestNetworkError(
      `Catalog manifest request failed: ${String(response.status)} ${response.statusText}`,
    )
  }

  let data: unknown

  try {
    data = await response.json()
  } catch {
    throw new ManifestValidationError('Catalog manifest is not valid JSON')
  }

  if (typeof data !== 'object' || data === null) {
    throw new ManifestValidationError('Catalog manifest root must be an object')
  }

  const manifest = data as Record<string, unknown>

  if (
    typeof manifest.version !== 'number' ||
    !Number.isFinite(manifest.version)
  ) {
    throw new ManifestValidationError(
      'Catalog manifest must have a numeric "version" field',
    )
  }

  if (manifest.version !== 1) {
    throw new ManifestValidationError(
      `Catalog manifest version ${String(manifest.version)} is not supported; expected version 1`,
    )
  }

  if (!Array.isArray(manifest.collections)) {
    throw new ManifestValidationError(
      'Catalog manifest must have a "collections" array',
    )
  }

  if (manifest.collections.length === 0) {
    throw new ManifestValidationError(
      'Catalog manifest "collections" array must not be empty',
    )
  }

  if (!Array.isArray(manifest.catalog)) {
    throw new ManifestValidationError(
      'Catalog manifest must have a "catalog" array',
    )
  }

  if (manifest.catalog.length === 0) {
    throw new ManifestValidationError(
      'Catalog manifest "catalog" array must not be empty',
    )
  }

  const collections = manifest.collections.map((raw, i) =>
    validateAndNormalizeCollection(raw, i),
  )

  const collectionIds = new Set<string>()
  for (const collection of collections) {
    if (collectionIds.has(collection.id)) {
      throw new ManifestValidationError(
        `collections: duplicate id "${collection.id}"`,
      )
    }
    collectionIds.add(collection.id)
  }

  const catalog = manifest.catalog.map((raw, i) =>
    validateAndNormalizeCatalogEntry(raw, i, collectionIds),
  )
  const environment = validateAndNormalizeEnvironment(manifest.environment)

  const catalogIds = new Set<string>()
  for (const entry of catalog) {
    if (catalogIds.has(entry.id)) {
      throw new ManifestValidationError(`catalog: duplicate id "${entry.id}"`)
    }
    catalogIds.add(entry.id)
  }

  const fetchEndTime = performance.now()
  const duration = (fetchEndTime - fetchStartTime).toFixed(2)
  perfLog('Catalog manifest loaded', {
    collections: collections.length,
    catalog: catalog.length,
    floorFinishes: environment.floorFinishes.length,
    wallFinishes: environment.wallFinishes.length,
    durationMs: `${duration}ms`,
  })

  return { catalog, collections, environment }
}
