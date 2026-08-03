import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { buildSourcePathByCatalogId } from '@/core/stores/assets-store'
import { parseSceneUrl } from '@/core/persistence/scene-url'
import type { SceneDraftState } from '@/core/persistence/scene-draft'
import { selectPrimaryRestoreState, validateDraftState } from './restore-flow'

/**
 * Shares the restore flow's own source selection so the gate cannot diverge
 * from what restore will attempt, but stays read-only: it must not consume the
 * URL param. A valid draft stays gated even when the link is primary - the
 * fallback taken when applying the link throws must find its collections loaded.
 */
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
  const validDraftState = validateDraftState(draft, catalog)
  const primary = selectPrimaryRestoreState({
    parseResult: parseSceneUrl(href),
    validDraftState,
    catalog,
  })
  const items = [...(primary.state?.items ?? [])]
  if (primary.source === 'link' && validDraftState) {
    items.push(...validDraftState.items)
  }
  const sourcePathByCatalogId = buildSourcePathByCatalogId(catalog, collections)
  const paths = new Set<string>()

  for (const item of items) {
    const sourcePath = sourcePathByCatalogId.get(item.catalogId)
    if (sourcePath) {
      paths.add(sourcePath)
    }
  }

  return [...paths]
}
