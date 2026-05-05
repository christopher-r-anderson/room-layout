import { resolvePublicAssetPath } from '@/lib/asset-path'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import type { FurnitureKind } from '@/scene/objects/furniture.types'

// Simple perf logger for dev mode instrumentation
const perfLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] 📦 ${message}`, data ?? '')
  }
}

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
}

function isRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  if (value.startsWith('http://') || value.startsWith('https://')) return false
  if (value.startsWith('//')) return false
  if (value.startsWith('/')) return false
  // Reject path traversal attempts (e.g., "../models/x.glb")
  if (value.includes('..')) return false
  return true
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

  if (!isRelativePath(entry.modelPath)) {
    throw new ManifestValidationError(
      `collections[${String(index)}] ("${entry.id}"): "modelPath" must be a relative path`,
    )
  }

  return {
    id: entry.id,
    sourcePath: resolvePublicAssetPath(entry.modelPath),
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

  if (typeof entry.footprintSize !== 'object' || entry.footprintSize === null) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "footprintSize" must be an object`,
    )
  }

  const footprint = entry.footprintSize as Record<string, unknown>

  if (typeof footprint.width !== 'number' || footprint.width <= 0) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "footprintSize.width" must be a positive number`,
    )
  }

  if (typeof footprint.depth !== 'number' || footprint.depth <= 0) {
    throw new ManifestValidationError(
      `catalog[${String(index)}] ("${id}"): "footprintSize.depth" must be a positive number`,
    )
  }

  if (!isRelativePath(entry.previewPath)) {
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
    footprintSize: {
      width: footprint.width,
      depth: footprint.depth,
    },
    previewPath: resolvePublicAssetPath(entry.previewPath),
  }
}

export async function fetchCatalogManifest(
  manifestUrl = 'catalog-manifest.json',
): Promise<CatalogManifestResult> {
  perfLog('Fetching catalog manifest...')
  const fetchStartTime = performance.now()

  let response: Response

  try {
    response = await fetch(resolvePublicAssetPath(manifestUrl))
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

  if (typeof manifest.version !== 'number') {
    throw new ManifestValidationError(
      'Catalog manifest must have a numeric "version" field',
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

  const collectionIds = new Set(collections.map((c) => c.id))

  const catalog = manifest.catalog.map((raw, i) =>
    validateAndNormalizeCatalogEntry(raw, i, collectionIds),
  )

  const fetchEndTime = performance.now()
  const duration = (fetchEndTime - fetchStartTime).toFixed(2)
  perfLog('Catalog manifest loaded', {
    collections: collections.length,
    catalog: catalog.length,
    durationMs: `${duration}ms`,
  })

  return { catalog, collections }
}
