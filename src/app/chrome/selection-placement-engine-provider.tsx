import { useMemo, type ReactNode } from 'react'
import { useComputeSelectedItemPlacement } from '@/features/selection/use-compute-selected-item-placement'
import { SelectedItemPlacementProvider } from '@/features/selection/selected-item-placement-provider'

interface SelectionPlacementEngineProviderProps {
  isCatalogDrawerOpen: boolean
  startupOverlayActive: boolean
  children: ReactNode
}

export function SelectionPlacementEngineProvider({
  isCatalogDrawerOpen,
  startupOverlayActive,
  children,
}: SelectionPlacementEngineProviderProps) {
  const { placement, actionsSizeRef } = useComputeSelectedItemPlacement({
    isCatalogDrawerOpen,
    startupOverlayActive,
  })

  const placementValue = useMemo(
    () => ({ placement, actionsSizeRef }),
    [placement, actionsSizeRef],
  )

  return (
    <SelectedItemPlacementProvider value={placementValue}>
      {children}
    </SelectedItemPlacementProvider>
  )
}
