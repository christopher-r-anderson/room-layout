import { createContext, useContext } from 'react'

interface SelectedItemInteraction {
  prepareDeleteBlurSuppression: () => void
  consumeBlurCommitSuppression: () => boolean
}

export const SelectedItemInteractionContext =
  createContext<SelectedItemInteraction | null>(null)

export function useSelectedItemInteraction(): SelectedItemInteraction {
  const value = useContext(SelectedItemInteractionContext)

  if (value === null) {
    throw new Error(
      'useSelectedItemInteraction must be used inside SelectedItemInteractionProvider',
    )
  }

  return value
}
