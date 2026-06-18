import { useEditorInteractionsEnabled } from '@/editor-state/editor-runtime-store'
import { useIsCatalogDrawerOpen } from '@/editor-state/dialog-store'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { SelectionToolsOther } from './selection-tools-other'

export interface FloatingSelectedItemSiteProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
}

export function FloatingSelectedItemSite({
  onOpenDeleteDialog,
  onRotateSelection,
}: FloatingSelectedItemSiteProps) {
  const placement = useSelectedItemPlacement()
  const actionsSizeRef = useSelectedItemActionsSizeRef()
  const interaction = useSelectedItemInteraction()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()

  if (selectedFurniture === null) {
    return null
  }
  if (placement.site !== 'floating') {
    return null
  }

  const controlsSuppressed = isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || isCatalogDrawerOpen

  const handleOpenDeleteDialog = () => {
    try {
      onOpenDeleteDialog()
    } finally {
      interaction.consumeBlurCommitSuppression()
    }
  }

  return (
    <section
      ref={actionsSizeRef}
      className="absolute top-0 left-0 pointer-events-auto transition-[transform,opacity] duration-150 ease-out"
      aria-label="Selected item actions"
      data-selected-toolbar-candidate={placement.candidateId}
      data-selected-toolbar-mode="floating"
      style={{
        transform: `translate3d(${String(placement.left)}px, ${String(placement.top)}px, 0)`,
      }}
      inert={controlsSuppressed}
    >
      <div className="rounded-xl border bg-background/90 p-1.5 shadow-sm backdrop-blur-sm">
        <SelectionToolsOther
          editorInteractionsEnabled={!controlsDisabled}
          onOpenDeleteDialog={handleOpenDeleteDialog}
          onPrepareDelete={interaction.prepareDeleteBlurSuppression}
          onRotateSelection={onRotateSelection}
          selectedFurniture={selectedFurniture}
        />
      </div>
    </section>
  )
}
