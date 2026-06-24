import {
  sceneDocumentStore,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  isBlockingOverlayOpen,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import {
  isEditorInteractive,
  useEditorInteractionsEnabled,
} from '@/core/stores/editor-lifecycle-store'

/**
 * Pure gating for the previewed id: the raw previewed id is shown only when the
 * editor is interactive, nothing is dragging, no blocking overlay is open, and
 * the id still refers to a live item.
 */
export function derivePreviewedId(
  previewedIdRaw: string | null,
  isDragging: boolean,
  blockingOverlayOpen: boolean,
  editorInteractionsEnabled: boolean,
  items: readonly { id: string }[],
): string | null {
  if (previewedIdRaw === null) {
    return null
  }

  if (isDragging || blockingOverlayOpen || !editorInteractionsEnabled) {
    return null
  }

  return items.some((item) => item.id === previewedIdRaw)
    ? previewedIdRaw
    : null
}

/**
 * The visible previewed id, derived from the scene-document, dialog, and
 * editor-lifecycle stores. Cross-store derived state, so it lives here as a
 * value module rather than in any single store.
 */
export function usePreviewedId(): string | null {
  const blockingOverlayOpen = useIsBlockingOverlayOpen()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()

  return useSceneDocumentStore((state) =>
    derivePreviewedId(
      state.previewedIdRaw,
      state.isDragging,
      blockingOverlayOpen,
      editorInteractionsEnabled,
      state.history.present,
    ),
  )
}

/** Non-reactive read of {@link usePreviewedId} for use outside React. */
export function getPreviewedId(): string | null {
  const state = sceneDocumentStore.getState()

  return derivePreviewedId(
    state.previewedIdRaw,
    state.isDragging,
    isBlockingOverlayOpen(),
    isEditorInteractive(),
    state.history.present,
  )
}
