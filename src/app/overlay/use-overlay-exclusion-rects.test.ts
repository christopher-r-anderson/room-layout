// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOverlayExclusionRects } from './use-overlay-exclusion-rects'

const measuredRects = new WeakMap<Element, DOMRectReadOnly>()
const originalVisualViewport = Object.getOwnPropertyDescriptor(
  window,
  'visualViewport',
)

function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
): DOMRectReadOnly {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  }
}

function createMeasuredElement(rect: DOMRectReadOnly) {
  const element = document.createElement('div')
  measuredRects.set(element, rect)
  return element
}

function setMeasuredRect(element: HTMLElement, rect: DOMRectReadOnly) {
  measuredRects.set(element, rect)
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = []

  private readonly callback: ResizeObserverCallback

  readonly observe = vi.fn<(target: Element) => void>()
  readonly unobserve = vi.fn<(target: Element) => void>()
  readonly disconnect = vi.fn<() => void>()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  trigger() {
    this.callback([], this)
  }
}

function installBoundingClientRectMock() {
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function getMeasuredRect(this: HTMLElement) {
      return measuredRects.get(this) ?? createRect(0, 0, 0, 0)
    })
}

function installResizeObserver() {
  MockResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
}

function getResizeObserverInstance() {
  const observer = MockResizeObserver.instances.at(0)

  if (!observer) {
    throw new Error('Expected a ResizeObserver instance to be registered')
  }

  return observer
}

function installVisualViewport() {
  const listeners = {
    resize: new Set<EventListener>(),
    scroll: new Set<EventListener>(),
  }

  const visualViewport = {
    addEventListener: vi.fn(
      (type: 'resize' | 'scroll', listener: EventListener) => {
        listeners[type].add(listener)
      },
    ),
    removeEventListener: vi.fn(
      (type: 'resize' | 'scroll', listener: EventListener) => {
        listeners[type].delete(listener)
      },
    ),
    dispatch(type: 'resize' | 'scroll') {
      const event = new Event(type)
      listeners[type].forEach((listener) => {
        listener(event)
      })
    },
  }

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: visualViewport,
  })

  return visualViewport
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  MockResizeObserver.instances = []

  if (originalVisualViewport) {
    Object.defineProperty(window, 'visualViewport', originalVisualViewport)
  } else {
    Reflect.deleteProperty(window, 'visualViewport')
  }
})

describe('useOverlayExclusionRects', () => {
  it('registers, replaces, and unregisters exclusion elements', async () => {
    installBoundingClientRectMock()
    installResizeObserver()
    installVisualViewport()

    const { result } = renderHook(() => useOverlayExclusionRects())
    const registerTopHeader =
      result.current.registerExclusionElement('top-header')

    expect(result.current.registerExclusionElement('top-header')).toBe(
      registerTopHeader,
    )

    const firstElement = createMeasuredElement(createRect(12, 8, 120, 48))

    act(() => {
      registerTopHeader(firstElement)
    })

    await waitFor(() => {
      expect(result.current.rects['top-header']).toMatchObject({
        x: 12,
        y: 8,
        width: 120,
        height: 48,
      })
    })

    const observer = getResizeObserverInstance()

    expect(observer.observe).toHaveBeenCalledWith(firstElement)

    const replacementElement = createMeasuredElement(createRect(24, 16, 96, 32))

    act(() => {
      registerTopHeader(replacementElement)
    })

    await waitFor(() => {
      expect(result.current.rects['top-header']).toMatchObject({
        x: 24,
        y: 16,
        width: 96,
        height: 32,
      })
    })

    expect(observer.unobserve).toHaveBeenCalledWith(firstElement)
    expect(observer.observe).toHaveBeenCalledWith(replacementElement)

    act(() => {
      registerTopHeader(null)
    })

    await waitFor(() => {
      expect(result.current.rects).toEqual({})
    })

    expect(observer.unobserve).toHaveBeenCalledWith(replacementElement)
  })

  it('refreshes exclusion rects from observer and viewport events', async () => {
    installBoundingClientRectMock()
    installResizeObserver()
    const visualViewport = installVisualViewport()

    const { result, unmount } = renderHook(() => useOverlayExclusionRects())
    const registerSelectedDetails =
      result.current.registerExclusionElement('selected-details')
    const element = createMeasuredElement(createRect(10, 20, 140, 60))

    act(() => {
      registerSelectedDetails(element)
    })

    await waitFor(() => {
      expect(result.current.rects['selected-details']).toMatchObject({
        x: 10,
        y: 20,
        width: 140,
        height: 60,
      })
    })

    const observer = getResizeObserverInstance()

    setMeasuredRect(element, createRect(14, 24, 150, 70))
    act(() => {
      observer.trigger()
    })

    await waitFor(() => {
      expect(result.current.rects['selected-details']).toMatchObject({
        x: 14,
        y: 24,
        width: 150,
        height: 70,
      })
    })

    setMeasuredRect(element, createRect(18, 28, 160, 80))
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    await waitFor(() => {
      expect(result.current.rects['selected-details']).toMatchObject({
        x: 18,
        y: 28,
        width: 160,
        height: 80,
      })
    })

    setMeasuredRect(element, createRect(22, 32, 170, 90))
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => {
      expect(result.current.rects['selected-details']).toMatchObject({
        x: 22,
        y: 32,
        width: 170,
        height: 90,
      })
    })

    setMeasuredRect(element, createRect(26, 36, 180, 100))
    act(() => {
      visualViewport.dispatch('resize')
    })

    await waitFor(() => {
      expect(result.current.rects['selected-details']).toMatchObject({
        x: 26,
        y: 36,
        width: 180,
        height: 100,
      })
    })

    setMeasuredRect(element, createRect(30, 40, 190, 110))
    act(() => {
      visualViewport.dispatch('scroll')
    })

    await waitFor(() => {
      expect(result.current.rects['selected-details']).toMatchObject({
        x: 30,
        y: 40,
        width: 190,
        height: 110,
      })
    })

    unmount()

    expect(observer.disconnect).toHaveBeenCalledTimes(1)
  })
})
