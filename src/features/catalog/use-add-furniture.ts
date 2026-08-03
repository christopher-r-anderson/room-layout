import { useCallback, useEffect, useState } from 'react'
import { formatPercent } from '@/shared/i18n/formatters'
import { useCollectionLoadPercent } from '@/core/stores/collection-loading-store'
import {
  addFurniture,
  prefetchCatalogItem,
  setCatalogDrawerOpen,
} from './catalog-actions'

// Delay before the Add button shows its pending state, so a fast or already-loaded
// add never flashes it.
const PENDING_DELAY_MS = 300

export interface UseAddFurniture {
  /** Awaits the model if needed, closes the drawer on success. */
  submit: () => void
  /** True immediately, guarding against a double-add. */
  isSubmitting: boolean
  /** True only past PENDING_DELAY_MS. */
  showPending: boolean
  percentLabel: string | null
}

/**
 * Encapsulates the Add drawer's submission flow: prefetch-on-select, the async add
 * with a delayed pending indicator, and the selected collection's download percent.
 */
export function useAddFurniture({
  catalogIdToAdd,
  selectedSourcePath,
  open,
  onAdded,
}: {
  catalogIdToAdd: string
  // The selected item's collection (the drawer already derives it per tile).
  selectedSourcePath: string | null
  open: boolean
  // Runs on a successful add, before the drawer closes, so the drawer can route
  // close focus to the just-added item instead of restoring it to the trigger.
  onAdded?: () => void
}): UseAddFurniture {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPending, setShowPending] = useState(false)

  const loadPercent = useCollectionLoadPercent(selectedSourcePath)
  const percentLabel =
    loadPercent !== null ? formatPercent(loadPercent / 100) : null

  // Prefetch the selected model while the drawer is open, so the add is usually
  // instant (see prefetchCatalogItem).
  useEffect(() => {
    if (open && catalogIdToAdd) {
      prefetchCatalogItem(catalogIdToAdd)
    }
  }, [open, catalogIdToAdd])

  const submit = useCallback(() => {
    // The button is disabled while submitting, but guard re-entry anyway so a
    // future non-button trigger cannot race two adds.
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    const pendingTimer = window.setTimeout(() => {
      setShowPending(true)
    }, PENDING_DELAY_MS)
    void addFurniture()
      .then((added) => {
        if (added) {
          onAdded?.()
          setCatalogDrawerOpen(false)
        }
      })
      .finally(() => {
        window.clearTimeout(pendingTimer)
        setIsSubmitting(false)
        setShowPending(false)
      })
  }, [isSubmitting, onAdded])

  return { submit, isSubmitting, showPending, percentLabel }
}
