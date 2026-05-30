// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElementRect } from './use-element-rect'

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

describe('useElementRect', () => {
  it('measures the provided element and updates from ResizeObserver', async () => {
    installBoundingClientRectMock()
    installResizeObserver()
    installVisualViewport()

    const element = createMeasuredElement(createRect(40, 24, 800, 600))
    const ref = { current: element }

    const { result } = renderHook(() => useElementRect(ref))

    await waitFor(() => {
      expect(result.current).toMatchObject({
        left: 40,
        top: 24,
        width: 800,
        height: 600,
      })
    })

    setMeasuredRect(element, createRect(64, 32, 720, 540))
    act(() => {
      getResizeObserverInstance().trigger()
    })

    await waitFor(() => {
      expect(result.current).toMatchObject({
        left: 64,
        top: 32,
        width: 720,
        height: 540,
      })
    })
  })

  it('refreshes from viewport events and clears when the element disappears', async () => {
    installBoundingClientRectMock()
    installResizeObserver()
    const visualViewport = installVisualViewport()

    const element = createMeasuredElement(createRect(12, 18, 640, 480))
    let ref = { current: element as HTMLElement | null }

    const { result, rerender } = renderHook(
      ({ targetRef }) => useElementRect(targetRef),
      {
        initialProps: { targetRef: ref },
      },
    )

    await waitFor(() => {
      expect(result.current).toMatchObject({ left: 12, top: 18 })
    })

    setMeasuredRect(element, createRect(20, 30, 640, 480))
    act(() => {
      visualViewport.dispatch('scroll')
    })

    await waitFor(() => {
      expect(result.current).toMatchObject({ left: 20, top: 30 })
    })

    act(() => {
      ref = { current: null }
      rerender({ targetRef: ref })
    })

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })
})
