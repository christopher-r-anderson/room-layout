import { type ReactElement, useEffect, useState } from 'react'
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
import { formatPercent } from '@/shared/i18n/formatters'
import { useDialogOpen } from '@/core/stores/dialog-store'
import { useCatalogEntries } from '@/core/stores/assets-store'
import { useCollectionLoadPercent } from '@/core/stores/collection-load-progress-store'
import { useFailedCollections } from '@/scene/scene-commands'
import {
  addFurniture,
  prefetchCatalogItem,
  resolveCollectionSourcePath,
  setCatalogDrawerOpen,
} from './catalog-actions'
import { CATALOG_DIALOG_ID } from './catalog-dialog-definition'
import {
  catalogSelectionActions,
  useActiveCatalogId,
} from './catalog-selection-store'

export function CatalogDrawer({
  triggerButton,
}: {
  triggerButton: ReactElement
}) {
  const { t } = useLingui()
  const catalog = useCatalogEntries()

  const formatFootprintLabel = (width: number, depth: number) => {
    const widthLabel = formatDecimal(width, 2)
    const depthLabel = formatDecimal(depth, 2)
    return t`${widthLabel}m x ${depthLabel}m footprint`
  }

  const catalogIdToAdd = useActiveCatalogId()
  const open = useDialogOpen(CATALOG_DIALOG_ID)
  const failedCollections = useFailedCollections()
  const selectedSourcePath = catalogIdToAdd
    ? resolveCollectionSourcePath(catalogIdToAdd)
    : null
  const selectedUnavailable = selectedSourcePath
    ? failedCollections.get(selectedSourcePath) === 'unavailable'
    : false
  const loadPercent = useCollectionLoadPercent(selectedSourcePath)
  const percentLabel =
    loadPercent !== null ? formatPercent(loadPercent / 100) : null
  // `isSubmitting` disables the button immediately (no double-add); the pending
  // label/spinner is delayed so a fast or already-loaded add never flashes it.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPending, setShowPending] = useState(false)

  // Prefetch-on-select: start loading the selected item's model while the drawer
  // is open, so the Add is usually instant by the time the user commits.
  useEffect(() => {
    if (open && catalogIdToAdd) {
      prefetchCatalogItem(catalogIdToAdd)
    }
  }, [open, catalogIdToAdd])

  const handleAddItem = async () => {
    setIsSubmitting(true)
    const PENDING_DELAY_MS = 300
    const pendingTimer = window.setTimeout(() => {
      setShowPending(true)
    }, PENDING_DELAY_MS)
    try {
      const added = await addFurniture()
      if (added) {
        setCatalogDrawerOpen(false)
      }
    } finally {
      window.clearTimeout(pendingTimer)
      setIsSubmitting(false)
      setShowPending(false)
    }
  }

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
              const entrySourcePath = resolveCollectionSourcePath(entry.id)
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
                  <input
                    className="peer sr-only"
                    aria-label={entry.name}
                    type="radio"
                    name="furniture-catalog"
                    value={entry.id}
                    checked={isSelected}
                    disabled={isUnavailable}
                    onChange={(event) => {
                      catalogSelectionActions.setSelectedCatalogId(
                        event.target.value,
                      )
                    }}
                  />
                  <span
                    className={cn(
                      'grid h-full gap-2 rounded-lg border bg-card p-2 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                      isUnavailable
                        ? ''
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
            onClick={() => {
              void handleAddItem()
            }}
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
