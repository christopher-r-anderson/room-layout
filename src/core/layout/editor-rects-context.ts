import { createContext, useContext } from 'react'

/** The live-measured editor regions: the overlay chrome panels plus the scene container. */
export type EditorRectId =
  | 'top-header'
  | 'outliner'
  | 'selected-details'
  | 'camera-tools'
  | 'room-surface'
  | 'room-view'

export type EditorRectMap = Partial<Record<EditorRectId, DOMRectReadOnly>>

export type RegisterEditorRect = (
  id: EditorRectId,
) => (element: HTMLElement | null) => void

// Split into two contexts so the stable registration handle and the changing
// measured rects do not share a value identity. Components that only register
// elements read the registry and never re-render when the rects update.
export const EditorRectRegistryContext =
  createContext<RegisterEditorRect | null>(null)
export const EditorRectsContext = createContext<EditorRectMap | null>(null)

export function useEditorRectRegistry(): RegisterEditorRect {
  const value = useContext(EditorRectRegistryContext)

  if (value === null) {
    throw new Error(
      'useEditorRectRegistry must be used within an EditorRectsProvider.',
    )
  }

  return value
}

export function useEditorRects(): EditorRectMap {
  const value = useContext(EditorRectsContext)

  if (value === null) {
    throw new Error(
      'useEditorRects must be used within an EditorRectsProvider.',
    )
  }

  return value
}
