/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

export interface SelectedItemInteraction {
  prepareDeleteBlurSuppression: () => void
  consumeBlurCommitSuppression: () => boolean
}

const SelectedItemInteractionContext =
  createContext<SelectedItemInteraction | null>(null)

export function SelectedItemInteractionProvider({
  children,
}: {
  children: ReactNode
}) {
  const suppressNextBlurCommitRef = useRef(false)

  const value = useMemo<SelectedItemInteraction>(
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

export function useSelectedItemInteraction(): SelectedItemInteraction {
  const value = useContext(SelectedItemInteractionContext)

  if (value === null) {
    throw new Error(
      'useSelectedItemInteraction must be used inside SelectedItemInteractionProvider',
    )
  }

  return value
}
