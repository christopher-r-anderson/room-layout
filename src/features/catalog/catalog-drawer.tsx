import { type ReactElement, useRef } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { IconLoader } from '@tabler/icons-react'
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
import { selectionActions } from '@/core/stores/selection-store'
import {
  useCatalogEntries,
  useSourcePathByCatalogId,
} from '@/core/stores/assets-store'
import { useFailedCollections } from '@/core/stores/collection-loading-store'
import { setCatalogDrawerOpen } from './catalog-actions'
import { CATALOG_DIALOG_ID } from './catalog-dialog-definition'
import {
  catalogSelectionActions,
  useActiveCatalogId,
} from './catalog-selection-store'
import { useAddFurniture } from './use-add-furniture'

export function CatalogDrawer({
  triggerButton,
}: {
  triggerButton: ReactElement
}) {
  const { t } = useLingui()
  const catalog = useCatalogEntries()
  // Derived once per manifest in the assets store; per-tile availability is one
  // map lookup.
  const sourcePathByCatalogId = useSourcePathByCatalogId()

  const formatFootprintLabel = (width: number, depth: number) => {
    const widthLabel = formatDecimal(width, 2)
    const depthLabel = formatDecimal(depth, 2)
    return t`${widthLabel}m x ${depthLabel}m footprint`
  }

  const catalogIdToAdd = useActiveCatalogId()
  const open = useDialogOpen(CATALOG_DIALOG_ID)
  const failedCollections = useFailedCollections()
  const selectedSourcePath = catalogIdToAdd
    ? (sourcePathByCatalogId.get(catalogIdToAdd) ?? null)
    : null
  // Set on a successful add so the close handler sends focus to the room view
  // (where the new item is now selected) instead of restoring it to the trigger.
  const focusRoomViewOnCloseRef = useRef(false)
  const { submit, isSubmitting, showPending, percentLabel } = useAddFurniture({
    catalogIdToAdd,
    selectedSourcePath,
    open,
    onAdded: () => {
      focusRoomViewOnCloseRef.current = true
    },
  })
  const selectedUnavailable = selectedSourcePath
    ? failedCollections.get(selectedSourcePath) === 'unavailable'
    : false

  return (
    <Drawer open={open} onOpenChange={setCatalogDrawerOpen} autoFocus>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent
        onCloseAutoFocus={(event) => {
          if (!focusRoomViewOnCloseRef.current) {
            return
          }

          // The likely next action after adding is to place the item, so route
          // focus to the room view where the arrow keys move the now-selected
          // item. On every other close the drawer restores focus to its trigger.
          focusRoomViewOnCloseRef.current = false
          event.preventDefault()
          selectionActions.requestRoomViewFocus()
        }}
      >
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
              const entrySourcePath = sourcePathByCatalogId.get(entry.id)
              const isUnavailable = entrySourcePath
                ? failedCollections.get(entrySourcePath) === 'unavailable'
                : false

              return (
                <label
                  key={entry.id}
                  className={cn(
                    'block min-w-0',
                    isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  {/* Locked while an add is submitting: the add captures the
                      selected id, so switching mid-add would show a different
                      selection than the item being placed. Only unavailability
                      dims the tile - a disabled-state treatment would flash
                      every tile during a fast add. */}
                  <input
                    className="peer sr-only"
                    aria-label={entry.name}
                    type="radio"
                    name="furniture-catalog"
                    value={entry.id}
                    checked={isSelected}
                    disabled={isUnavailable || isSubmitting}
                    onChange={(event) => {
                      catalogSelectionActions.setSelectedCatalogId(
                        event.target.value,
                      )
                    }}
                  />
                  <span
                    className={cn(
                      'grid h-full gap-2 rounded-lg border bg-card p-2 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50',
                      isUnavailable
                        ? 'cursor-not-allowed opacity-50'
                        : isSelected
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
                      {isUnavailable ? (
                        <span className="text-xs/relaxed font-medium text-destructive">
                          <Trans>Unavailable</Trans>
                        </span>
                      ) : (
                        <span className="text-xs/relaxed text-muted-foreground">
                          {formatFootprintLabel(
                            entry.footprintSize.width,
                            entry.footprintSize.depth,
                          )}
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>
        </div>

        <DrawerFooter>
          <Button
            disabled={!catalogIdToAdd || isSubmitting || selectedUnavailable}
            onClick={submit}
          >
            {showPending ? (
              <>
                <IconLoader
                  size={16}
                  className="shrink-0 animate-spin"
                  aria-hidden="true"
                />
                {percentLabel !== null ? (
                  <Trans>Adding… {percentLabel}</Trans>
                ) : (
                  <Trans>Adding…</Trans>
                )}
              </>
            ) : (
              <Trans>Add Item</Trans>
            )}
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
