// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSelectedItemPlacement } from '@/features/selection/selected-item-placement-context'
import { useExclusionRects } from '@/shared/layout/overlay-exclusion-context'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { EditorProviders } from './editor-providers'

function ProvidersProbe() {
  const exclusionRects = useExclusionRects()
  const placement = useSelectedItemPlacement()
  const dispatch = useCommandDispatch()

  return (
    <div
      data-testid="providers-probe"
      data-placement-site={placement.site}
      data-exclusion-count={String(Object.keys(exclusionRects).length)}
      data-has-dispatch={String(typeof dispatch === 'function')}
    />
  )
}

describe('EditorProviders', () => {
  it('composes the editor provider tree from the supplied refs and dispatch', () => {
    const roomViewRef = createRef<HTMLElement>()
    const dockedInspectorRef = createRef<HTMLDivElement>()

    expect(() => {
      render(
        <EditorProviders
          editorRefs={{ roomViewRef, dockedInspectorRef }}
          dispatchCommand={vi.fn()}
        >
          <ProvidersProbe />
        </EditorProviders>,
      )
    }).not.toThrow()

    const probe = screen.getByTestId('providers-probe')
    expect(probe).toHaveAttribute('data-placement-site', 'hidden')
    expect(probe).toHaveAttribute('data-exclusion-count', '0')
    expect(probe).toHaveAttribute('data-has-dispatch', 'true')
  })
})
