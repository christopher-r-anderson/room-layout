import { cn } from '@/lib/utils'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

export function CurrentSelectionStatus({
  className,
  selectedFurniture,
}: {
  className?: string
  selectedFurniture: FurnitureItem | null
}) {
  return (
    <p
      className={cn(
        'rounded-md bg-muted px-2 py-1 inline',
        !selectedFurniture && 'text-muted-foreground',
        className,
      )}
    >
      Selected: {selectedFurniture ? selectedFurniture.name : 'none'}
    </p>
  )
}
