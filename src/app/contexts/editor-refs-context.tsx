/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react'

export interface EditorRefs {
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

export function EditorRefsProvider(props: {
  value: EditorRefs
  children: ReactNode
}) {
  return (
    <EditorRefsContext.Provider value={props.value}>
      {props.children}
    </EditorRefsContext.Provider>
  )
}
