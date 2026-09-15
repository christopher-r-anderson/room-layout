import type { ReactNode } from 'react'
import {
  EditorRectsContext,
  EditorRectRegistryContext,
  type EditorRectMap,
  type RegisterEditorRect,
} from './editor-rects-context'

export function EditorRectsProvider(props: {
  registerRect: RegisterEditorRect
  rects: EditorRectMap
  children: ReactNode
}) {
  // The registry value is a stable callback, so registry-only consumers do not
  // re-render when the rects value below changes.
  return (
    <EditorRectRegistryContext.Provider value={props.registerRect}>
      <EditorRectsContext.Provider value={props.rects}>
        {props.children}
      </EditorRectsContext.Provider>
    </EditorRectRegistryContext.Provider>
  )
}
