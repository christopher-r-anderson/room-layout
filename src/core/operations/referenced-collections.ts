import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { buildSourcePathByCatalogId } from '@/core/stores/assets-store'
import { parseSceneUrl } from '../persistence/scene-url'
import type { SceneDraftState } from '../persistence/scene-draft'
import { selectPrimaryRestoreState, validateDraftState } from './restore-flow'

// Resolves the gated set at bootstrap: which collections the scene about to be
// restored may reference. Uses the restore flow's own source selection
// (selectPrimaryRestoreState), so the gate cannot diverge from what restore will
// attempt - but is read-only: it must not consume the URL param or apply
// anything; the real restore does that once at readiness. When the link is
// primary, a valid draft stays gated too: the restore flow falls back to it if
// applying the link throws, and that fallback must find its collections loaded.
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
