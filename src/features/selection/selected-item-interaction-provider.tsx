import { useMemo, useRef, type ReactNode } from 'react'
import { SelectedItemInteractionContext } from './selected-item-interaction-context'

export function SelectedItemInteractionProvider({
  children,
}: {
  children: ReactNode
}) {
  // One-shot latch: the delete button arms it on pointerdown (which fires
  // before the details field's blur) so the blur skips committing an edit to
  // an item about to be deleted; the dispatch path consumes it in a finally
  // so a refused delete cannot leave it armed.
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
