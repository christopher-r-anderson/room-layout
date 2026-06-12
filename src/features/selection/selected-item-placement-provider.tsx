import type { ReactNode } from 'react'
import { SelectedItemPlacementContext } from './selected-item-placement-context'

export function SelectedItemPlacementProvider({
  value,
  children,
}: {
  value: Parameters<typeof SelectedItemPlacementContext.Provider>[0]['value']
  children: ReactNode
}) {
  return (
    <SelectedItemPlacementContext.Provider value={value}>
      {children}
    </SelectedItemPlacementContext.Provider>
  )
}
