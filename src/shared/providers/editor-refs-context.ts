import { createContext, useContext, type RefObject } from 'react'

export interface EditorRefs {
  roomViewRef: RefObject<HTMLElement | null>
  dockedInspectorRef: RefObject<HTMLDivElement | null>
  selectedToolbarRef: RefObject<HTMLDivElement | null>
}

export const EditorRefsContext = createContext<EditorRefs | null>(null)

export function useEditorRefs(): EditorRefs {
  const value = useContext(EditorRefsContext)

  if (value === null) {
    throw new Error('useEditorRefs must be used within an EditorRefsProvider.')
  }

  return value
}
