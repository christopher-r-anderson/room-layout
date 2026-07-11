import { type ReactNode } from 'react'
import { EditorRectsProvider } from '@/core/layout/editor-rects-provider'
import type { EditorRectId } from '@/core/layout/editor-rects-context'
import { useRectRegistry } from '@/shared/layout/use-rect-registry'

interface ShellLayoutServicesProviderProps {
  children: ReactNode
}

export function ShellLayoutServicesProvider({
  children,
}: ShellLayoutServicesProviderProps) {
  const { rects, registerRectElement } = useRectRegistry<EditorRectId>()

  return (
    <EditorRectsProvider registerRect={registerRectElement} rects={rects}>
      {children}
    </EditorRectsProvider>
  )
}
