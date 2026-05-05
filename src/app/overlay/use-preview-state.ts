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

  if (previewedId !== null && !itemIds.includes(previewedId)) {
    setPreviewedId(null)
  }

  const setPreview = useCallback((id: string) => {
    setPreviewedId(id)
  }, [])

  const clearPreview = useCallback(() => {
    setPreviewedId(null)
  }, [])

  const derivedPreviewedId =
    isDragging || isModalOpen || !editorInteractionsEnabled ? null : previewedId

  return { previewedId: derivedPreviewedId, setPreview, clearPreview }
}
