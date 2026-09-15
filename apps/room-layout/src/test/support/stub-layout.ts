import { vi } from 'vitest'

type MediaQueryChangeListener = (event: { matches: boolean }) => void

/**
 * jsdom's matchMedia never matches, which reads as the mobile layout. This
 * stub makes the layout controllable and captures change listeners so tests
 * can flip it. Pair with `vi.unstubAllGlobals()` in afterEach.
 */
export function stubLayout(initial: 'desktop' | 'mobile') {
  let matches = initial === 'desktop'
  const listeners = new Set<MediaQueryChangeListener>()

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      addEventListener: (_: string, listener: MediaQueryChangeListener) => {
        listeners.add(listener)
      },
      removeEventListener: (_: string, listener: MediaQueryChangeListener) => {
        listeners.delete(listener)
      },
    })),
  )

  return {
    flipTo(layout: 'desktop' | 'mobile') {
      matches = layout === 'desktop'
      listeners.forEach((listener) => {
        listener({ matches })
      })
    },
  }
}
