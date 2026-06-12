import type { ReactNode } from 'react'
import { EditorRefsContext, useEditorRefs } from './editor-refs-context'

export function EditorRefsProvider(props: {
  value: ReturnType<typeof useEditorRefs>
  children: ReactNode
}) {
  return (
    <EditorRefsContext.Provider value={props.value}>
      {props.children}
    </EditorRefsContext.Provider>
  )
}
