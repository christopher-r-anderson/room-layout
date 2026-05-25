import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectionToolsOther } from './selection-tools-other'

export function SelectedItemActions({
  disabled,
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
  selectedFurniture,
}: {
  disabled: boolean
  onOpenDeleteDialog: () => void
  onPrepareDelete: () => void
  onRotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem
}) {
  return (
    <section className="pointer-events-auto" aria-label="Selected item actions">
      <Card
        className="w-full bg-background/90 shadow-sm backdrop-blur-sm"
        size="sm"
      >
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
