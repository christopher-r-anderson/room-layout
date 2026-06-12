import { createContext, useContext } from 'react'
import type { SelectedItemPlacement } from './selected-item-placement.types'

interface SelectedItemPlacementContextValue {
  placement: SelectedItemPlacement
  actionsSizeRef: (element: HTMLElement | null) => void
}

export const SelectedItemPlacementContext =
  createContext<SelectedItemPlacementContextValue | null>(null)

export function useSelectedItemPlacement(): SelectedItemPlacement {
  const value = useContext(SelectedItemPlacementContext)

  if (value === null) {
    throw new Error(
      'useSelectedItemPlacement must be used inside SelectedItemPlacementProvider',
    )
  }

  return value.placement
}

export function useSelectedItemActionsSizeRef() {
  const value = useContext(SelectedItemPlacementContext)

  if (value === null) {
    throw new Error(
      'useSelectedItemActionsSizeRef must be used inside SelectedItemPlacementProvider',
    )
  }

  return value.actionsSizeRef
}
