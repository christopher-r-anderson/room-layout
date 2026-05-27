import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectionToolsOther } from './selection-tools-other'
import { cn } from '@/lib/utils'

export function SelectedItemActions({
  className,
  disabled,
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
  selectedFurniture,
}: {
  className?: string
  disabled: boolean
  onOpenDeleteDialog: () => void
  onPrepareDelete: () => void
  onRotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem
}) {
  return (
    <section
      className={cn('pointer-events-auto', className)}
      aria-label="Selected item actions"
    >
      <Card className="bg-background/90 shadow-sm backdrop-blur-sm" size="sm">
        <CardHeader>
          <CardTitle>Selected item actions</CardTitle>
          <p className="text-xs/relaxed text-muted-foreground">
            {selectedFurniture.name}
          </p>
        </CardHeader>
        <CardContent>
          <SelectionToolsOther
            editorInteractionsEnabled={!disabled}
            onOpenDeleteDialog={onOpenDeleteDialog}
            onPrepareDelete={onPrepareDelete}
            onRotateSelection={onRotateSelection}
            selectedFurniture={selectedFurniture}
          />
        </CardContent>
      </Card>
    </section>
  )
}
