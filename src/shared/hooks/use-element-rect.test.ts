// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElementRectRef } from './use-element-rect'

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

describe('useElementRectRef', () => {
  it('supports a callback ref variant that measures after mount', async () => {
    installBoundingClientRectMock()
    installResizeObserver()
    installVisualViewport()

    const element = createMeasuredElement(createRect(18, 24, 320, 180))
    const { result } = renderHook(() => useElementRectRef())

    act(() => {
      result.current.ref(element)
    })

    await waitFor(() => {
      expect(result.current.rect).toMatchObject({
        left: 18,
        top: 24,
        width: 320,
        height: 180,
      })
    })
  })
})
