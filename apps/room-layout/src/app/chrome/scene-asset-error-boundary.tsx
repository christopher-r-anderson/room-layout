import { Component, type ReactNode } from 'react'

/**
 * Catches errors thrown while the scene loads its assets and reports them via
 * onError (which drives the recovery overlay). Renders nothing on error - the
 * visible recovery UI lives elsewhere. Must be a class: error boundaries have no
 * hook equivalent.
 */
export class SceneAssetErrorBoundary extends Component<
  {
    children: ReactNode
    onError: (error: Error) => void
  },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
