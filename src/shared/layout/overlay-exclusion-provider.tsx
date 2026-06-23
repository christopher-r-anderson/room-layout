import type { ReactNode } from 'react'
import {
  ExclusionRectsContext,
  ExclusionRegistryContext,
  type ExclusionRectMap,
  type RegisterExclusionElement,
} from './overlay-exclusion-context'

export function OverlayExclusionProvider(props: {
  registerExclusionElement: RegisterExclusionElement
  exclusionRects: ExclusionRectMap
  children: ReactNode
}) {
  // The registry value is a stable callback, so registry-only consumers do not
  // re-render when the rects value below changes.
  return (
    <ExclusionRegistryContext.Provider value={props.registerExclusionElement}>
      <ExclusionRectsContext.Provider value={props.exclusionRects}>
        {props.children}
      </ExclusionRectsContext.Provider>
    </ExclusionRegistryContext.Provider>
  )
}
