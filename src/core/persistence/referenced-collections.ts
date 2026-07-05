import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { buildSourcePathByCatalogId } from '@/core/stores/assets-store'
import { parseSceneUrl } from './scene-url'
import type { SceneDraftState } from './scene-draft'
import { selectPrimaryRestoreState, validateDraftState } from './restore-flow'

// Resolves the gated set at bootstrap: which collections the scene about to be
// restored references. Uses the restore flow's own source selection
// (selectPrimaryRestoreState), so the gate cannot diverge from what restore will
// attempt - but is read-only: it must not consume the URL param or apply
// anything; the real restore does that once at readiness.
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
  const primary = selectPrimaryRestoreState({
    parseResult: parseSceneUrl(href),
    validDraftState: validateDraftState(draft, catalog),
    catalog,
  })
  const items = primary.state?.items ?? []
  const sourcePathByCatalogId = buildSourcePathByCatalogId(
    catalog,
    collections,
  )
  const paths = new Set<string>()

  for (const item of items) {
    const sourcePath = sourcePathByCatalogId.get(item.catalogId)
    if (sourcePath) {
      paths.add(sourcePath)
    }
  }

  return [...paths]
}
