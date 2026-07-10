import { useCallback, type Ref } from 'react'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { focusActions } from '@/core/stores/focus-store'
import { isFocusLeaving } from '@/shared/lib/focus'
import { SelectedDetailsView } from './selected-details-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { updateSelectedItemDetails } from './selected-item-detail-actions'
import { formatSelectedItemDetailsInvalidValueMessage } from './selected-item-detail-messages'

export function SelectedDetailsPanel({ ref }: { ref?: Ref<HTMLElement> }) {
  const interaction = useSelectedItemInteraction()
  const { detailsPanelRef } = useEditorRefs()
  const selectedFurniture = useSelectedFurniture()

  // Stable so React only calls it on real mount/unmount; the panel unmounts
  // without a blur event when the selection clears while it holds focus.
  const wrapperRef = useCallback(
    (element: HTMLDivElement | null) => {
      detailsPanelRef.current = element
      if (element === null) {
        focusActions.surfaceBlurred('inspector')
      }
    },
    [detailsPanelRef],
  )

  if (selectedFurniture === null) {
    return null
  }

  return (
    <div
      ref={wrapperRef}
      className="contents"
      onFocus={() => {
        focusActions.surfaceFocused('inspector')
      }}
      onBlur={(event) => {
        if (isFocusLeaving(event)) {
          focusActions.surfaceBlurred('inspector')
        }
      }}
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
