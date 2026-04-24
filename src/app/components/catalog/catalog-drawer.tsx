import { type ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'

function formatMeasurement(value: number) {
  return Number(value.toFixed(2)).toString()
}

function formatFootprintLabel(width: number, depth: number) {
  return `${formatMeasurement(width)}m x ${formatMeasurement(depth)}m footprint`
}

export function CatalogDrawer({
  catalogIdToAdd,
  editorInteractionsEnabled,
  onOpenChange,
  onAddFurniture,
  onCatalogIdToAddChange,
  open,
  triggerButton,
}: {
  catalogIdToAdd: string
  editorInteractionsEnabled: boolean
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  triggerButton: ReactElement
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add furniture</DrawerTitle>
          <DrawerDescription>
            Choose a piece, then place it into the room.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 max-h-[90vh] sm:max-h-[30vh] overflow-y-auto">
          <fieldset className="grid grid-cols-5 gap-2 border-0 p-0 pb-2 max-[980px]:grid-cols-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
            <legend className="sr-only">Furniture type to add</legend>
            {FURNITURE_CATALOG.map((entry) => {
              const isSelected = catalogIdToAdd === entry.id

              return (
                <label key={entry.id} className="block min-w-0 cursor-pointer">
                  <input
                    className="peer sr-only"
                    aria-label={entry.name}
                    type="radio"
                    name="furniture-catalog"
                    value={entry.id}
                    checked={isSelected}
                    disabled={!editorInteractionsEnabled}
                    onChange={(event) => {
                      onCatalogIdToAddChange(event.target.value)
                    }}
                  />
                  <span
                    className={cn(
                      'grid h-full gap-2 rounded-lg border bg-card p-2 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                      isSelected
                        ? 'border-primary/60 bg-primary/5'
                        : 'hover:border-foreground/20 hover:shadow-sm',
                    )}
                    aria-hidden="true"
                  >
                    <span className="block aspect-4/3 overflow-hidden rounded-md bg-muted">
                      <img
                        className="block size-full object-cover"
                        src={entry.previewPath}
                        alt=""
                      />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-xs/relaxed font-medium text-foreground">
                        {entry.name}
                      </span>
                      <span className="text-xs/relaxed text-muted-foreground">
                        {formatFootprintLabel(
                          entry.footprintSize.width,
                          entry.footprintSize.depth,
                        )}
                      </span>
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>
        </div>

        <DrawerFooter>
          <Button
            disabled={!editorInteractionsEnabled || !catalogIdToAdd}
            onClick={() => {
              const added = onAddFurniture()

              if (added) {
                onOpenChange(false)
              }
            }}
          >
            Add Item
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
