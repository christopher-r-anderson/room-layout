// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSelectedItemPlacement } from '@/features/selection/selected-item-placement-context'
import { useEditorRects } from '@/core/layout/editor-rects-context'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { EditorProviders } from './editor-providers'

function ProvidersProbe() {
  const exclusionRects = useEditorRects()
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
  it('composes the editor provider tree, owning the refs and building dispatch', () => {
    expect(() => {
      render(
        <EditorProviders>
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
