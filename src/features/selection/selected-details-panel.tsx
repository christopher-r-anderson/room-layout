import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { SelectedDetailsView } from './selected-details-view'
import { resolveSelectionControlsInteractivity } from './selection-controls-interactivity'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import {
  invalidSelectedItemDetailValueMessage,
  updateSelectedItemDetails,
} from './selected-item-detail-actions'

export interface SelectedDetailsPanelProps {
  isCatalogDrawerOpen: boolean
}

export function SelectedDetailsPanel({
  isCatalogDrawerOpen,
}: SelectedDetailsPanelProps) {
  const interaction = useSelectedItemInteraction()
  const { detailsPanelRef } = useEditorRefs()
  const registerExclusionElement = useExclusionRegistry()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const dispatch = useCommandDispatch()

  if (selectedFurniture === null) {
    return null
  }

  const interactivity = resolveSelectionControlsInteractivity({
    editorInteractionsEnabled,
    isCatalogDrawerOpen,
  })

  const handleOpenDeleteDialog = () => {
    try {
      dispatch({ kind: 'open-delete-dialog', returnFocusTo: 'outliner' })
    } finally {
      interaction.consumeBlurCommitSuppression()
    }
  }

  return (
    <div
      ref={(element) => {
        detailsPanelRef.current = element
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
        onRotateSelection={(direction) => {
          dispatch({ kind: 'rotate-selection', direction })
        }}
        onInvalidSelectedItemDetailValue={invalidSelectedItemDetailValueMessage}
        onUpdateSelectedItemDetails={updateSelectedItemDetails}
      />
    </div>
  )
}
