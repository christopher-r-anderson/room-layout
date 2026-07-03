import { Component, type ReactNode } from 'react'

/**
 * Isolates a single on-demand furniture-collection load. Unlike the gated
 * SceneAssetErrorBoundary, a failure here must NOT error the editor: the room
 * and everything already loaded stay usable, and only this collection is
 * unavailable. Renders nothing on error and warns for diagnostics. (Retry of a
 * failed on-demand collection is a deferred follow-up.) Must be a class: error
 * boundaries have no hook equivalent.
 */
export class OnDemandAssetErrorBoundary extends Component<
  {
    children: ReactNode
    path: string
  },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn(
      `Failed to load furniture collection on demand: ${this.props.path}`,
      error,
    )
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
