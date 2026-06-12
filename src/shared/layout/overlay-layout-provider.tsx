import type { ReactNode } from 'react'
import {
  OverlayLayoutContext,
  useOverlayLayout,
} from './overlay-layout-context'

export function OverlayLayoutProvider(props: {
  value: ReturnType<typeof useOverlayLayout>
  children: ReactNode
}) {
  return (
    <OverlayLayoutContext.Provider value={props.value}>
      {props.children}
    </OverlayLayoutContext.Provider>
  )
}
