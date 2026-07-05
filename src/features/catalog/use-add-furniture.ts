import { useCallback, useEffect, useState } from 'react'
import { formatPercent } from '@/shared/i18n/formatters'
import { useCollectionLoadPercent } from '@/core/stores/collection-loading-store'
import {
  addFurniture,
  prefetchCatalogItem,
  resolveCollectionSourcePath,
  setCatalogDrawerOpen,
} from './catalog-actions'

// Delay before the Add button shows its pending state, so a fast or already-loaded
// add never flashes it.
const PENDING_DELAY_MS = 300

export interface UseAddFurniture {
  // Fire the add: awaits the model if needed, closes the drawer on success.
  submit: () => void
  // Disables the button immediately (prevents a double-add).
  isSubmitting: boolean
  // Shows the pending spinner/label (delayed past PENDING_DELAY_MS).
  showPending: boolean
  // Localized download percent of the selected collection, or null when unknown.
  percentLabel: string | null
  // The selected item's collection, for the caller to check availability.
  selectedSourcePath: string | null
}

// Encapsulates the Add drawer's submission flow: prefetch-on-select, the async add
// with a delayed pending indicator, and the selected collection's download percent.
export function useAddFurniture({
  catalogIdToAdd,
  open,
}: {
  catalogIdToAdd: string
  open: boolean
}): UseAddFurniture {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPending, setShowPending] = useState(false)

  const selectedSourcePath = catalogIdToAdd
    ? resolveCollectionSourcePath(catalogIdToAdd)
    : null
  const loadPercent = useCollectionLoadPercent(selectedSourcePath)
  const percentLabel =
    loadPercent !== null ? formatPercent(loadPercent / 100) : null

  // Prefetch-on-select: start loading the selected model while the drawer is open,
  // so the add is usually instant by the time the user commits.
  useEffect(() => {
    if (open && catalogIdToAdd) {
      prefetchCatalogItem(catalogIdToAdd)
    }
  }, [open, catalogIdToAdd])

  const submit = useCallback(() => {
    setIsSubmitting(true)
    const pendingTimer = window.setTimeout(() => {
      setShowPending(true)
    }, PENDING_DELAY_MS)
    void addFurniture()
      .then((added) => {
        if (added) {
          setCatalogDrawerOpen(false)
        }
      })
      .finally(() => {
        window.clearTimeout(pendingTimer)
        setIsSubmitting(false)
        setShowPending(false)
      })
  }, [])

  return { submit, isSubmitting, showPending, percentLabel, selectedSourcePath }
}
