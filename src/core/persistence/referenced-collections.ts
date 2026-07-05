import type { FurnitureInstance } from '@/domain/furniture'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { parseSceneUrl, validateCatalogReferences } from './scene-url'
import type { SceneDraftState } from './scene-draft'

// Resolves the gated set at bootstrap: which collections the scene about to be
// restored references. It mirrors the restore precedence (shared link, else local
// draft, else nothing) but is read-only - it must not consume the URL param or
// apply anything; the real restore does that once at readiness.
export function resolveReferencedCollectionPaths({
  href,
  draft,
  catalog,
  collections,
}: {
  href: string
  draft: SceneDraftState | null
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
}): string[] {
  const items = resolveRestoreItems({ href, draft, catalog })
  const paths = new Set<string>()

  for (const item of items) {
    const entry = catalog.find((candidate) => candidate.id === item.catalogId)
    if (!entry) {
      continue
    }

    const collection = collections.find(
      (candidate) => candidate.id === entry.collectionId,
    )
    if (collection) {
      paths.add(collection.sourcePath)
    }
  }

  return [...paths]
}

function resolveRestoreItems({
  href,
  draft,
  catalog,
}: {
  href: string
  draft: SceneDraftState | null
  catalog: FurnitureCatalogEntry[]
}): FurnitureInstance[] {
  const parseResult = parseSceneUrl(href)
  if (parseResult.ok && validateCatalogReferences(parseResult.items, catalog)) {
    return parseResult.items
  }

  if (draft && validateCatalogReferences(draft.items, catalog)) {
    return draft.items
  }

  return []
}
