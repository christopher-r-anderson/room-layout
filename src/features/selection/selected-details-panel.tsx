import type { Ref } from 'react'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { SelectedDetailsView } from './selected-details-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { updateSelectedItemDetails } from './selected-item-detail-actions'
import { formatSelectedItemDetailsInvalidValueMessage } from './selected-item-detail-messages'

export function SelectedDetailsPanel({ ref }: { ref?: Ref<HTMLElement> }) {
  const interaction = useSelectedItemInteraction()
  const { detailsPanelRef } = useEditorRefs()
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
        sectionRef={ref}
        consumeBlurCommitSuppression={interaction.consumeBlurCommitSuppression}
        onInvalidSelectedItemDetailValue={
          formatSelectedItemDetailsInvalidValueMessage
        }
        onUpdateSelectedItemDetails={updateSelectedItemDetails}
      />
    </div>
  )
}
