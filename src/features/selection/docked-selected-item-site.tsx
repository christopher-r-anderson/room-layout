import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useOverlayLayout } from '@/shared/layout/overlay-layout-context'
import {
  useEditorInteractionsEnabled,
  useStartupOverlayActive,
} from '@/editor-state/editor-runtime-store'
import { useIsCatalogDrawerOpen } from '@/editor-state/dialog-store'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/editor-state/types/selected-item.types'
import { SelectedDetailsView } from './selected-details-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { useSelectedItemActionsSizeRef } from './selected-item-placement-context'

export interface DockedSelectedItemSiteProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}

export function DockedSelectedItemSite({
  onOpenDeleteDialog,
  onRotateSelection,
  onInvalidSelectedItemDetailValue,
  onUpdateSelectedItemDetails,
}: DockedSelectedItemSiteProps) {
  const actionsSizeRef = useSelectedItemActionsSizeRef()
  const interaction = useSelectedItemInteraction()
  const { dockedInspectorRef, selectedItemControlsRef } = useEditorRefs()
  const { registerExclusionElement } = useOverlayLayout()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const startupOverlayActive = useStartupOverlayActive()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()

  if (selectedFurniture === null) {
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
      ref={(element) => {
        dockedInspectorRef.current = element
        selectedItemControlsRef.current = element
      }}
      inert={controlsSuppressed}
      aria-hidden={controlsSuppressed}
      className="absolute pointer-events-none inset-0 z-10"
    >
      <SelectedDetailsView
        className="absolute bottom-30 md:bottom-2 left-2 right-2 md:left-auto md:w-auto"
        key={selectedFurniture.id}
        disabled={controlsDisabled}
        selectedFurniture={selectedFurniture}
        sectionRef={registerExclusionElement('selected-details')}
        actionsSectionRef={actionsSizeRef}
        consumeBlurCommitSuppression={interaction.consumeBlurCommitSuppression}
        onOpenDeleteDialog={handleOpenDeleteDialog}
        onPrepareDelete={interaction.prepareDeleteBlurSuppression}
        onRotateSelection={onRotateSelection}
        onInvalidSelectedItemDetailValue={onInvalidSelectedItemDetailValue}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />
    </div>
  )
}
