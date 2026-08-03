import { useMemo, useRef, type ReactNode } from 'react'
import { SelectedItemInteractionContext } from './selected-item-interaction-context'

export function SelectedItemInteractionProvider({
  children,
}: {
  children: ReactNode
}) {
  // One-shot latch shared by the details field and the toolbar's delete
  // button. The button arms it on pointerdown - which fires before the
  // field's blur - so an in-progress edit is not committed to an item that is
  // about to be deleted. The dispatch path consumes it in a finally so a
  // refused delete cannot leave it armed for the next unrelated blur.
  const suppressNextBlurCommitRef = useRef(false)

  const value = useMemo(
    () => ({
      prepareDeleteBlurSuppression: () => {
        suppressNextBlurCommitRef.current = true
      },
      consumeBlurCommitSuppression: () => {
        if (!suppressNextBlurCommitRef.current) {
          return false
        }

        suppressNextBlurCommitRef.current = false
        return true
      },
    }),
    [],
  )

  return (
    <SelectedItemInteractionContext.Provider value={value}>
      {children}
    </SelectedItemInteractionContext.Provider>
  )
}
