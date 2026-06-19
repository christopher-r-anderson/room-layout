import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useOverlayLayout } from '@/shared/layout/overlay-layout-context'
import { useEditorInteractionsEnabled } from '@/editor-state/editor-runtime-store'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/editor-state/types/selected-item.types'
import { SelectedDetailsView } from './selected-details-view'
import { resolveSelectionControlsInteractivity } from './selection-controls-interactivity'
import { useSelectedItemInteraction } from './selected-item-interaction-context'

export interface DockedSelectedItemSiteProps {
  isCatalogDrawerOpen: boolean
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}

export function DockedSelectedItemSite({
  isCatalogDrawerOpen,
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

  if (selectedFurniture === null) {
    return null
  }

  const interactivity = resolveSelectionControlsInteractivity({
    editorInteractionsEnabled,
    isCatalogDrawerOpen,
  })

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
      inert={interactivity.suppressed}
      className="contents"
    >
      <SelectedDetailsView
        key={selectedFurniture.id}
        disabled={interactivity.disabled}
        disabledMessage={interactivity.disabledMessage}
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
