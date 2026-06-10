import { useEditorRefs } from '@/app/contexts/editor-refs-context'
import {
  useEditorInteractionsEnabled,
  useStartupOverlayActive,
} from '@/editor-state/editor-runtime-store'
import { useIsCatalogDrawerOpen } from '@/editor-state/dialog-store'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import { SelectedActionsView } from './selected-actions-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'

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
  const { selectedItemControlsRef } = useEditorRefs()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const startupOverlayActive = useStartupOverlayActive()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()

  if (selectedFurniture === null) {
    return null
  }

  if (placement.site !== 'floating') {
    return null
  }

  const controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || controlsSuppressed

  const handleOpenDeleteDialog = () => {
    try {
      onOpenDeleteDialog()
    } finally {
      interaction.consumeBlurCommitSuppression()
    }
  }

  return (
    <div
      ref={selectedItemControlsRef}
      inert={controlsSuppressed}
      className="absolute pointer-events-none w-full h-full z-10"
      aria-hidden={controlsSuppressed}
    >
      <SelectedActionsView
        className="absolute transition-[transform,opacity] duration-150 ease-out"
        disabled={controlsDisabled}
        onOpenDeleteDialog={handleOpenDeleteDialog}
        onPrepareDelete={interaction.prepareDeleteBlurSuppression}
        placementCandidateId={placement.candidateId}
        onRotateSelection={onRotateSelection}
        placementMode="floating"
        sectionRef={actionsSizeRef}
        selectedFurniture={selectedFurniture}
        style={{
          transform: `translate3d(${String(placement.left)}px, ${String(placement.top)}px, 0)`,
        }}
      />
    </div>
  )
}
