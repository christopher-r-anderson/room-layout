import { resolvePublicAssetPath } from '@/shared/lib/asset-path'
import {
  type EnvironmentMaterialConfig,
  type FloorFinishOption,
  type LightingMoodOption,
  type WallFinishOption,
} from '@/domain/environment-materials'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { FurnitureKind } from '@/domain/furniture'
import { createDevPerfLogger } from '@/shared/debug/perf-log'

const perfLog = createDevPerfLogger('📦')

// Adding a new kind here must be paired with updating the FurnitureKind union
// in src/domain/furniture.ts.
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

function requireObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new ManifestValidationError(message)
  }
  return value as Record<string, unknown>
}

// Primitive field validators take a `context` describing where in the manifest the
// value lives (e.g. `catalog[3] ("couch-1")`) so failures point to the offending entry.

function requireNonEmptyString(
  value: unknown,
  context: string,
  field: string,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ManifestValidationError(
      `${context}: "${field}" must be a non-empty string`,
    )
  }
  return value.trim()
}

function requirePositiveFinite(
  value: unknown,
  context: string,
  field: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ManifestValidationError(
      `${context}: "${field}" must be a positive finite number`,
    )
  }
  return value
}

function requireNonNegativeFinite(
  value: unknown,
  context: string,
  field: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ManifestValidationError(
      `${context}: "${field}" must be a non-negative finite number`,
    )
  }
  return value
}

function requireDimensions(
  source: Record<string, unknown>,
  context: string,
  field: string,
): { width: number; depth: number } {
  const dimensions = requireObject(
    source[field],
    `${context}: "${field}" must be an object`,
  )
  return {
    width: requirePositiveFinite(dimensions.width, context, `${field}.width`),
    depth: requirePositiveFinite(dimensions.depth, context, `${field}.depth`),
  }
}

function requireNonEmptyArray(
  value: unknown,
  missingMessage: string,
  emptyMessage: string,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new ManifestValidationError(missingMessage)
  }
  if (value.length === 0) {
    throw new ManifestValidationError(emptyMessage)
  }
  return value
}

function collectUniqueIds(
  items: readonly { id: string }[],
  label: string,
): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new ManifestValidationError(`${label}: duplicate id "${item.id}"`)
    }
    ids.add(item.id)
  }
  return ids
}

// An optional default id reference: absent falls back to the first entry, but a
// present value must be a string referencing an existing id.
function resolveDefaultId(
  value: unknown,
  validIds: Set<string>,
  fallback: string,
  errorMessage: string,
): string {
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'string' || !validIds.has(value)) {
    throw new ManifestValidationError(errorMessage)
  }
  return value
}

// Reject schemes, absolute/protocol-relative paths, Windows separators, and
// encoded separator/traversal tokens. Applied both before and after decoding.
function hasUnsafePathForm(value: string): boolean {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) return true
  if (value.startsWith('//') || value.startsWith('/')) return true
  if (value.includes('\\')) return true
  if (/%2e|%2f|%5c/i.test(value)) return true
  return false
}

function normalizeRelativeAssetPath(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed === '') return null
  if (hasUnsafePathForm(trimmed)) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    return null
  }

  if (hasUnsafePathForm(decoded)) return null

  const rawSegments = decoded.split('/')

  if (
    rawSegments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return null
  }

  return rawSegments.map((segment) => encodeURIComponent(segment)).join('/')
}

function validateAndNormalizeCollection(
  raw: unknown,
  index: number,
): FurnitureCollection {
  const context = `collections[${String(index)}]`
  const entry = requireObject(raw, `${context}: must be an object`)

  const id = requireNonEmptyString(entry.id, context, 'id')

  const normalizedModelPath = normalizeRelativeAssetPath(entry.modelPath)
  if (normalizedModelPath === null) {
    throw new ManifestValidationError(
      `${context} ("${id}"): "modelPath" must be a relative path`,
    )
  }

  return {
    id,
    sourcePath: resolvePublicAssetPath(normalizedModelPath),
  }
}

function validateAndNormalizeCatalogEntry(
  raw: unknown,
  index: number,
  collectionIds: Set<string>,
): FurnitureCatalogEntry {
  const entry = requireObject(
    raw,
    `catalog[${String(index)}]: must be an object`,
  )

  const id = requireNonEmptyString(entry.id, `catalog[${String(index)}]`, 'id')
  const context = `catalog[${String(index)}] ("${id}")`

  const name = requireNonEmptyString(entry.name, context, 'name')

  if (
    typeof entry.kind !== 'string' ||
    !KNOWN_FURNITURE_KINDS.includes(entry.kind as FurnitureKind)
  ) {
    throw new ManifestValidationError(
      `${context}: "kind" must be one of: ${KNOWN_FURNITURE_KINDS.join(', ')}`,
    )
  }

  if (
    typeof entry.collectionId !== 'string' ||
    !collectionIds.has(entry.collectionId.trim())
  ) {
    throw new ManifestValidationError(
      `${context}: "collectionId" must reference a defined collection`,
    )
  }

  const nodeName = requireNonEmptyString(entry.nodeName, context, 'nodeName')

  if (
    entry.uiBoundsNodeName !== undefined &&
    (typeof entry.uiBoundsNodeName !== 'string' ||
      entry.uiBoundsNodeName.trim() === '')
  ) {
    throw new ManifestValidationError(
      `${context}: "uiBoundsNodeName" must be a non-empty string when provided`,
    )
  }

  const footprintSize = requireDimensions(entry, context, 'footprintSize')

  const normalizedPreviewPath = normalizeRelativeAssetPath(entry.previewPath)
  if (normalizedPreviewPath === null) {
    throw new ManifestValidationError(
      `${context}: "previewPath" must be a relative path`,
    )
  }

  return {
    id,
    name,
    kind: entry.kind as FurnitureKind,
    collectionId: entry.collectionId.trim(),
    nodeName,
    ...(entry.uiBoundsNodeName
      ? { uiBoundsNodeName: entry.uiBoundsNodeName.trim() }
      : {}),
    footprintSize,
    previewPath: resolvePublicAssetPath(normalizedPreviewPath),
  }
}

function parseHexColor(
  value: unknown,
  context: string,
  field = 'color',
): number {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new ManifestValidationError(
      `${context}: "${field}" must be a #RRGGBB string`,
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
  const entry = requireObject(
    raw,
    `environment.floorFinishes[${String(index)}]: must be an object`,
  )

  const id = requireNonEmptyString(
    entry.id,
    `environment.floorFinishes[${String(index)}]`,
    'id',
  )
  const context = `environment.floorFinishes[${String(index)}] ("${id}")`

  const label = requireNonEmptyString(entry.label, context, 'label')

  const normalizedDiffusePath = normalizeRelativeAssetPath(entry.diffusePath)
  if (normalizedDiffusePath === null) {
    throw new ManifestValidationError(
      `${context}: "diffusePath" must be a relative path`,
    )
  }

  const normalizedNormalPath = normalizeRelativeAssetPath(entry.normalPath)
  if (normalizedNormalPath === null) {
    throw new ManifestValidationError(
      `${context}: "normalPath" must be a relative path`,
    )
  }

  const tileSizeMeters = requireDimensions(entry, context, 'tileSizeMeters')

  const previewPath = normalizeOptionalPreviewPath(entry.previewPath, context)

  return {
    id,
    label,
    diffusePath: resolvePublicAssetPath(normalizedDiffusePath),
    normalPath: resolvePublicAssetPath(normalizedNormalPath),
    ...(previewPath ? { previewPath } : {}),
    tileSizeMeters,
  }
}

function validateAndNormalizeWallFinish(
  raw: unknown,
  index: number,
): WallFinishOption {
  const entry = requireObject(
    raw,
    `environment.wallFinishes[${String(index)}]: must be an object`,
  )

  const id = requireNonEmptyString(
    entry.id,
    `environment.wallFinishes[${String(index)}]`,
    'id',
  )
  const context = `environment.wallFinishes[${String(index)}] ("${id}")`

  const label = requireNonEmptyString(entry.label, context, 'label')

  if (entry.previewPath !== undefined) {
    throw new ManifestValidationError(
      `${context}: "previewPath" is not supported; wall swatches are derived from "color"`,
    )
  }

  return {
    id,
    label,
    color: parseHexColor(entry.color, context),
  }
}

function validateAndNormalizeLightingMood(
  raw: unknown,
  index: number,
): LightingMoodOption {
  const entry = requireObject(
    raw,
    `environment.lightingMoods[${String(index)}]: must be an object`,
  )

  const id = requireNonEmptyString(
    entry.id,
    `environment.lightingMoods[${String(index)}]`,
    'id',
  )
  const context = `environment.lightingMoods[${String(index)}] ("${id}")`

  const label = requireNonEmptyString(entry.label, context, 'label')

  return {
    id,
    label,
    exposure: requirePositiveFinite(entry.exposure, context, 'exposure'),
    ambientIntensity: requireNonNegativeFinite(
      entry.ambientIntensity,
      context,
      'ambientIntensity',
    ),
    hemisphereSkyColor: parseHexColor(
      entry.hemisphereSkyColor,
      context,
      'hemisphereSkyColor',
    ),
    hemisphereGroundColor: parseHexColor(
      entry.hemisphereGroundColor,
      context,
      'hemisphereGroundColor',
    ),
    hemisphereIntensity: requireNonNegativeFinite(
      entry.hemisphereIntensity,
      context,
      'hemisphereIntensity',
    ),
    keyLightColor: parseHexColor(entry.keyLightColor, context, 'keyLightColor'),
    keyLightIntensity: requireNonNegativeFinite(
      entry.keyLightIntensity,
      context,
      'keyLightIntensity',
    ),
    fillLightColor: parseHexColor(
      entry.fillLightColor,
      context,
      'fillLightColor',
    ),
    fillLightIntensity: requireNonNegativeFinite(
      entry.fillLightIntensity,
      context,
      'fillLightIntensity',
    ),
    environmentColor: parseHexColor(
      entry.environmentColor,
      context,
      'environmentColor',
    ),
    environmentIntensity: requireNonNegativeFinite(
      entry.environmentIntensity,
      context,
      'environmentIntensity',
    ),
    backgroundIntensity: requireNonNegativeFinite(
      entry.backgroundIntensity,
      context,
      'backgroundIntensity',
    ),
  }
}

function validateAndNormalizeEnvironment(
  raw: unknown,
): EnvironmentMaterialConfig {
  const environment = requireObject(
    raw,
    'Catalog manifest must have an "environment" object',
  )

  const rawFloorFinishes = requireNonEmptyArray(
    environment.floorFinishes,
    'Catalog manifest environment must have a "floorFinishes" array',
    'Catalog manifest environment "floorFinishes" array must not be empty',
  )
  const rawWallFinishes = requireNonEmptyArray(
    environment.wallFinishes,
    'Catalog manifest environment must have a "wallFinishes" array',
    'Catalog manifest environment "wallFinishes" array must not be empty',
  )
  const rawLightingMoods = requireNonEmptyArray(
    environment.lightingMoods,
    'Catalog manifest environment must have a "lightingMoods" array',
    'Catalog manifest environment "lightingMoods" array must not be empty',
  )

  const floorFinishes = rawFloorFinishes.map((rawFloor, i) =>
    validateAndNormalizeFloorFinish(rawFloor, i),
  )
  const wallFinishes = rawWallFinishes.map((rawWall, i) =>
    validateAndNormalizeWallFinish(rawWall, i),
  )
  const lightingMoods = rawLightingMoods.map((rawMood, i) =>
    validateAndNormalizeLightingMood(rawMood, i),
  )

  const floorIds = collectUniqueIds(floorFinishes, 'environment.floorFinishes')
  const wallIds = collectUniqueIds(wallFinishes, 'environment.wallFinishes')
  const lightingMoodIds = collectUniqueIds(
    lightingMoods,
    'environment.lightingMoods',
  )

  return {
    floorFinishes,
    wallFinishes,
    lightingMoods,
    defaultFloorFinishId: resolveDefaultId(
      environment.defaultFloorFinishId,
      floorIds,
      floorFinishes[0].id,
      'Catalog manifest environment "defaultFloorFinishId" must reference an existing floor finish id',
    ),
    defaultWallFinishId: resolveDefaultId(
      environment.defaultWallFinishId,
      wallIds,
      wallFinishes[0].id,
      'Catalog manifest environment "defaultWallFinishId" must reference an existing wall finish id',
    ),
    defaultLightingMoodId: resolveDefaultId(
      environment.defaultLightingMoodId,
      lightingMoodIds,
      lightingMoods[0].id,
      'Catalog manifest environment "defaultLightingMoodId" must reference an existing lighting mood id',
    ),
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

  const manifest = requireObject(
    data,
    'Catalog manifest root must be an object',
  )

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

  const rawCollections = requireNonEmptyArray(
    manifest.collections,
    'Catalog manifest must have a "collections" array',
    'Catalog manifest "collections" array must not be empty',
  )
  const rawCatalog = requireNonEmptyArray(
    manifest.catalog,
    'Catalog manifest must have a "catalog" array',
    'Catalog manifest "catalog" array must not be empty',
  )

  const collections = rawCollections.map((raw, i) =>
    validateAndNormalizeCollection(raw, i),
  )
  const collectionIds = collectUniqueIds(collections, 'collections')

  const catalog = rawCatalog.map((raw, i) =>
    validateAndNormalizeCatalogEntry(raw, i, collectionIds),
  )
  collectUniqueIds(catalog, 'catalog')

  const environment = validateAndNormalizeEnvironment(manifest.environment)

  const fetchEndTime = performance.now()
  const duration = (fetchEndTime - fetchStartTime).toFixed(2)
  perfLog('Catalog manifest loaded', {
    collections: collections.length,
    catalog: catalog.length,
    floorFinishes: environment.floorFinishes.length,
    wallFinishes: environment.wallFinishes.length,
    lightingMoods: environment.lightingMoods.length,
    durationMs: `${duration}ms`,
  })

  return { catalog, collections, environment }
}
