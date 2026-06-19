import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useOverlayLayout } from '@/shared/layout/overlay-layout-context'
import { useEditorInteractionsEnabled } from '@/editor-state/editor-runtime-store'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'
import { useDialogOpen } from '@/editor-state/dialog-store'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/editor-state/types/selected-item.types'
import { SelectedDetailsView } from './selected-details-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'

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
  const interaction = useSelectedItemInteraction()
  const { dockedInspectorRef, selectedItemControlsRef } = useEditorRefs()
  const { registerExclusionElement } = useOverlayLayout()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isCatalogDrawerOpen = useDialogOpen(DIALOG_IDS.catalog)

  if (selectedFurniture === null) {
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
    <div
      ref={(element) => {
        dockedInspectorRef.current = element
        selectedItemControlsRef.current = element
      }}
      inert={controlsSuppressed}
      className="contents"
    >
      <SelectedDetailsView
        key={selectedFurniture.id}
        disabled={controlsDisabled}
        selectedFurniture={selectedFurniture}
        sectionRef={registerExclusionElement('selected-details')}
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
