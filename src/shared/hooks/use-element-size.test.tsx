// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElementSize } from './use-element-size'

const measuredRects = new WeakMap<Element, DOMRectReadOnly>()

const originalVisualViewport = Object.getOwnPropertyDescriptor(
  window,
  'visualViewport',
)

function createRect(
  width: number,
  height: number,
  x = 0,
  y = 0,
): DOMRectReadOnly {
  return {
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON: () => ({}),
  }
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

function Harness({ visible }: { visible: boolean }) {
  const { ref, size } = useElementSize()

  return (
    <>
      <output aria-label="measured size">
        {size.width}x{size.height}
      </output>
      {visible ? (
        <div
          ref={(element) => {
            if (element) {
              measuredRects.set(element, createRect(164, 52))
            }
            ref(element)
          }}
        />
      ) : null}
    </>
  )
}

describe('useElementSize', () => {
  it('measures an element that appears after the first render', async () => {
    const getBoundingClientRect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getMeasuredRect(this: HTMLElement) {
        return measuredRects.get(this) ?? createRect(0, 0)
      })
    vi.stubGlobal('ResizeObserver', undefined)

    const { rerender } = render(<Harness visible={false} />)

    expect(screen.getByLabelText('measured size')).toHaveTextContent('0x0')

    rerender(<Harness visible />)

    await waitFor(() => {
      expect(screen.getByLabelText('measured size')).toHaveTextContent('164x52')
    })

    getBoundingClientRect.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not rerender for position-only viewport changes', async () => {
    const visualViewport = installVisualViewport()
    const onRender = vi.fn()
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function getMeasuredRect(this: HTMLElement) {
        return measuredRects.get(this) ?? createRect(0, 0)
      },
    )

    function RenderCountHarness() {
      const { ref, size } = useElementSize()

      return (
        <>
          <output aria-label="measured size">
            {size.width}x{size.height}
          </output>
          <div
            ref={(element) => {
              if (element) {
                measuredRects.set(element, createRect(164, 52, 8, 12))
              }
              ref(element)
            }}
          />
        </>
      )
    }

    render(
      <Profiler id="use-element-size" onRender={onRender}>
        <RenderCountHarness />
      </Profiler>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('measured size')).toHaveTextContent('164x52')
    })

    const renderCountAfterMeasure = onRender.mock.calls.length

    const element = document.querySelector('div')
    if (!(element instanceof HTMLElement)) {
      throw new Error('Expected measured element to be rendered')
    }

    measuredRects.set(element, createRect(164, 52, 24, 36))

    act(() => {
      window.dispatchEvent(new Event('scroll'))
      visualViewport.dispatch('scroll')
    })

    expect(screen.getByLabelText('measured size')).toHaveTextContent('164x52')
    expect(onRender).toHaveBeenCalledTimes(renderCountAfterMeasure)
  })
})
