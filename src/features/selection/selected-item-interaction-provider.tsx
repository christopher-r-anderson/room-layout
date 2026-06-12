import { useMemo, useRef, type ReactNode } from 'react'
import { SelectedItemInteractionContext } from './selected-item-interaction-context'

export function SelectedItemInteractionProvider({
  children,
}: {
  children: ReactNode
}) {
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
