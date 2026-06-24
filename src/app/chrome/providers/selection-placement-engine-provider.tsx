import { useMemo, type ReactNode } from 'react'
import { useComputeSelectedItemPlacement } from '@/features/selection/use-compute-selected-item-placement'
import { SelectedItemPlacementProvider } from '@/features/selection/selected-item-placement-provider'

interface SelectionPlacementEngineProviderProps {
  children: ReactNode
}

export function SelectionPlacementEngineProvider({
  children,
}: SelectionPlacementEngineProviderProps) {
  const { placement, actionsSizeRef } = useComputeSelectedItemPlacement()

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
