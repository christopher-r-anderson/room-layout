import { useCallback, useLayoutEffect, useRef, type Ref } from 'react'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { focusActions, usePendingFocus } from '@/core/stores/focus-store'
import { focusFirstControl, isFocusLeaving } from '@/shared/lib/focus'
import { SelectedDetailsView } from './selected-details-view'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { updateSelectedItemDetails } from './selected-item-detail-actions'
import { formatSelectedItemDetailsInvalidValueMessage } from './selected-item-detail-messages'

export function SelectedDetailsPanel({ ref }: { ref?: Ref<HTMLElement> }) {
  const interaction = useSelectedItemInteraction()
  const selectedFurniture = useSelectedFurniture()
  const pendingFocus = usePendingFocus()
  const directive = pendingFocus?.surface === 'inspector' ? pendingFocus : null
  const elementRef = useRef<HTMLDivElement | null>(null)

  // Stable so React only calls it on real mount/unmount; the panel unmounts
  // without a blur event when the selection clears while it holds focus.
  const wrapperRef = useCallback((element: HTMLDivElement | null) => {
    elementRef.current = element
    if (element === null) {
      focusActions.surfaceBlurred('inspector')
    }
  }, [])

  // Realizes inspector focus directives on the panel's first control.
  useLayoutEffect(() => {
    if (!directive) {
      return
    }

    if (focusFirstControl(elementRef.current)) {
      focusActions.directiveRealized(directive)
    }
  }, [directive])

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
