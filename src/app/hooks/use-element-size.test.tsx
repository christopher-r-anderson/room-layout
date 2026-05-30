// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useElementSize } from './use-element-size'

const measuredRects = new WeakMap<Element, DOMRectReadOnly>()

function createRect(width: number, height: number): DOMRectReadOnly {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }
}

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
})
