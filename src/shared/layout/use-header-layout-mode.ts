import { useSyncExternalStore } from 'react'

export type HeaderLayoutMode = 'mobile' | 'desktop'

export const HEADER_DESKTOP_MEDIA_QUERY = '(min-width: 48rem)'

function unsubscribe() {
  return undefined
}

function getMediaQueryList() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null
  }

  return window.matchMedia(HEADER_DESKTOP_MEDIA_QUERY)
}

function getSnapshot(): HeaderLayoutMode {
  return getMediaQueryList()?.matches ? 'desktop' : 'mobile'
}

function subscribe(onStoreChange: () => void) {
  const mediaQueryList = getMediaQueryList()

  if (!mediaQueryList) {
    return unsubscribe
  }

  const handleChange = () => {
    onStoreChange()
  }

  mediaQueryList.addEventListener('change', handleChange)

  return () => {
    mediaQueryList.removeEventListener('change', handleChange)
  }
}

export function useHeaderLayoutMode(): HeaderLayoutMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'mobile')
}

/** Non-reactive snapshot for reads outside React rendering. */
export function getHeaderLayoutMode(): HeaderLayoutMode {
  return getSnapshot()
}

/** Change subscription for non-React coordinators; returns an unsubscribe. */
export function subscribeToHeaderLayoutMode(onChange: () => void): () => void {
  return subscribe(onChange)
}
