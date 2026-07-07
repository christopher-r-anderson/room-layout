import { useShallow } from 'zustand/react/shallow'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { useSceneSessionStore } from '@/core/stores/scene-session-store'
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
 *
 * The drag/overlay/interactive suppressors are mirrored in preview-reconciler,
 * which clears the raw id so nothing stale reappears when a gate lifts. Keep the
 * two condition sets in sync (the live-item check here is display-only).
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
 * The visible previewed id, derived from the scene-session, scene-document,
 * dialog, and editor-lifecycle stores. Cross-store derived state, so it lives
 * here as a value module rather than in any single store.
 */
export function usePreviewedId(): string | null {
  const { previewedIdRaw, isDragging } = useSceneSessionStore(
    useShallow((state) => ({
      previewedIdRaw: state.previewedIdRaw,
      isDragging: state.isDragging,
    })),
  )
  const blockingOverlayOpen = useIsBlockingOverlayOpen()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()

  return useSceneDocumentStore((state) =>
    derivePreviewedId(
      previewedIdRaw,
      isDragging,
      blockingOverlayOpen,
      editorInteractionsEnabled,
      state.history.present,
    ),
  )
}

/** Non-reactive read of {@link usePreviewedId} for use outside React. */
export function getPreviewedId(): string | null {
  const { previewedIdRaw, isDragging } = useSceneSessionStore.getState()

  return derivePreviewedId(
    previewedIdRaw,
    isDragging,
    isBlockingOverlayOpen(),
    isEditorInteractive(),
    useSceneDocumentStore.getState().history.present,
  )
}
