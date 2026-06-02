/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import type { SelectedItemPlacement } from './selected-item-placement.types'

export interface SelectedItemPlacementContextValue {
  placement: SelectedItemPlacement
  actionsSizeRef: (element: HTMLElement | null) => void
}

const SelectedItemPlacementContext =
  createContext<SelectedItemPlacementContextValue | null>(null)

export function SelectedItemPlacementProvider({
  value,
  children,
}: {
  value: SelectedItemPlacementContextValue
  children: ReactNode
}) {
  return (
    <SelectedItemPlacementContext.Provider value={value}>
      {children}
    </SelectedItemPlacementContext.Provider>
  )
}

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
