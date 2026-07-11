import { useCallback, useLayoutEffect, useRef, type Ref } from 'react'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { focusActions, usePendingFocus } from '@/core/stores/focus-store'
import { useSurfaceFocusClaim } from '@/core/layout/use-surface-focus-claim'
import { focusFirstControl } from '@/shared/lib/focus'
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
  const claim = useSurfaceFocusClaim('inspector')

  const wrapperRef = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element
      claim.claimRef(element)
    },
    [claim],
  )

  // Realizes inspector focus directives on the panel's first control. The
  // directive is consumed even if no control matched: a directive for a
  // mounted surface must realize or drop, never linger.
  useLayoutEffect(() => {
    if (!directive) {
      return
    }

    focusFirstControl(elementRef.current)
    focusActions.directiveRealized(directive)
  }, [directive])

  if (selectedFurniture === null) {
    return null
  }

  return (
    <div
      ref={wrapperRef}
      className="contents"
      onFocus={claim.onFocus}
      onBlur={claim.onBlur}
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
