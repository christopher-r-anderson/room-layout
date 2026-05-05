import { useCallback, useState } from 'react'

interface UsePreviewStateOptions {
  isDragging: boolean
  isModalOpen: boolean
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
  isModalOpen,
  editorInteractionsEnabled,
  itemIds,
}: UsePreviewStateOptions): PreviewState {
  const [previewedId, setPreviewedId] = useState<string | null>(null)

  const setPreview = useCallback((id: string) => {
    setPreviewedId(id)
  }, [])

  const clearPreview = useCallback(() => {
    setPreviewedId(null)
  }, [])

  // Derive preview synchronously so gating does not require effect-driven writes.
  let derivedPreviewedId = previewedId
  if (isDragging || isModalOpen || !editorInteractionsEnabled) {
    derivedPreviewedId = null
  } else if (previewedId !== null && !itemIds.includes(previewedId)) {
    derivedPreviewedId = null
  }

  return { previewedId: derivedPreviewedId, setPreview, clearPreview }
}
