import { useCallback, useEffect, useState } from 'react'

interface UsePreviewStateOptions {
  isDragging: boolean
  isBlockingOverlayOpen: boolean
  editorInteractionsEnabled: boolean
  itemIds: readonly string[]
}

interface PreviewState {
  previewedId: string | null
  setPreview: (id: string) => void
  clearPreview: () => void
}

export function usePreviewState({
  isDragging,
  isBlockingOverlayOpen,
  editorInteractionsEnabled,
  itemIds,
}: UsePreviewStateOptions): PreviewState {
  const [previewedId, setPreviewedId] = useState<string | null>(null)

  useEffect(() => {
    if (previewedId === null || itemIds.includes(previewedId)) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- local preview state must be reconciled when the backing item disappears.
    setPreviewedId(null)
  }, [itemIds, previewedId])

  const setPreview = useCallback((id: string) => {
    setPreviewedId(id)
  }, [])

  const clearPreview = useCallback(() => {
    setPreviewedId(null)
  }, [])

  const derivedPreviewedId =
    isDragging || isBlockingOverlayOpen || !editorInteractionsEnabled
      ? null
      : previewedId

  return { previewedId: derivedPreviewedId, setPreview, clearPreview }
}
