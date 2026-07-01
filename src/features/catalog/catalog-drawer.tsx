import { type ReactElement } from 'react'
import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { formatDecimal } from '@/shared/i18n/formatters'
import { Button } from '@/shared/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/shared/ui/drawer'
import { cn } from '@/shared/lib/utils'
import { useDialogOpen } from '@/core/stores/dialog-store'
import { useCatalogEntries } from '@/core/stores/assets-store'
import { addFurniture, setCatalogDrawerOpen } from './catalog-actions'
import { catalogDialogId } from './catalog-dialog-definition'
import {
  catalogSelectionActions,
  useActiveCatalogId,
} from './catalog-selection-store'

function formatFootprintLabel(i18n: I18n, width: number, depth: number) {
  const widthLabel = formatDecimal(width, 2)
  const depthLabel = formatDecimal(depth, 2)
  return i18n._(msg`${widthLabel}m x ${depthLabel}m footprint`)
}

export function CatalogDrawer({
  triggerButton,
}: {
  triggerButton: ReactElement
}) {
  // Subscribe to locale changes so footprint labels re-resolve when a non-default
  // locale activates after first render.
  const { i18n } = useLingui()
  const catalog = useCatalogEntries()
  const catalogIdToAdd = useActiveCatalogId()
  const open = useDialogOpen(catalogDialogId)

  return (
    <Drawer open={open} onOpenChange={setCatalogDrawerOpen} autoFocus>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            <Trans>Add furniture</Trans>
          </DrawerTitle>
          <DrawerDescription>
            <Trans>Choose a piece, then place it into the room.</Trans>
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 max-h-[90vh] sm:max-h-[30vh] overflow-y-auto">
          <fieldset className="grid grid-cols-5 gap-2 border-0 p-0 pb-2 max-[980px]:grid-cols-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
            <legend className="sr-only">
              <Trans>Furniture type to add</Trans>
            </legend>
            {catalog.map((entry) => {
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
                    onChange={(event) => {
                      catalogSelectionActions.setSelectedCatalogId(
                        event.target.value,
                      )
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
                          i18n,
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
            disabled={!catalogIdToAdd}
            onClick={() => {
              const added = addFurniture()

              if (added) {
                setCatalogDrawerOpen(false)
              }
            }}
          >
            <Trans>Add Item</Trans>
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">
              <Trans>Close</Trans>
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
