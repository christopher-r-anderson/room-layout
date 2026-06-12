import { createContext, useContext, type RefObject } from 'react'

interface EditorRefs {
  roomViewRef: RefObject<HTMLElement | null>
  selectedItemControlsRef: RefObject<HTMLDivElement | null>
}

export const EditorRefsContext = createContext<EditorRefs | null>(null)

export function useEditorRefs(): EditorRefs {
  const value = useContext(EditorRefsContext)

  if (value === null) {
    throw new Error('useEditorRefs must be used within an EditorRefsProvider.')
  }

  return value
}
