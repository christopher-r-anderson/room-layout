import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { SelectedDetailsView } from './selected-details-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import {
  invalidSelectedItemDetailValueMessage,
  updateSelectedItemDetails,
} from './selected-item-detail-actions'

export function SelectedDetailsPanel() {
  const interaction = useSelectedItemInteraction()
  const { detailsPanelRef } = useEditorRefs()
  const registerExclusionElement = useExclusionRegistry()
  const selectedFurniture = useSelectedFurniture()

  if (selectedFurniture === null) {
    return null
  }

  return (
    <div
      ref={(element) => {
        detailsPanelRef.current = element
      }}
      className="contents"
    >
      <SelectedDetailsView
        key={selectedFurniture.id}
        selectedFurniture={selectedFurniture}
        sectionRef={registerExclusionElement('selected-details')}
        consumeBlurCommitSuppression={interaction.consumeBlurCommitSuppression}
        onInvalidSelectedItemDetailValue={invalidSelectedItemDetailValueMessage}
        onUpdateSelectedItemDetails={updateSelectedItemDetails}
      />
    </div>
  )
}
