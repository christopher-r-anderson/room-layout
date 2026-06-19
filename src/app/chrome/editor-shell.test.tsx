// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { EditorRefsProvider } from '../../shared/providers/editor-refs-provider'
import { useSelectedItemPlacement } from '@/features/selection/selected-item-placement-context'
import { useOverlayLayout } from '../../shared/layout/overlay-layout-context'
import { EditorShell } from './editor-shell'

function ShellContextProbe() {
  const overlayLayout = useOverlayLayout()
  const placement = useSelectedItemPlacement()

  return (
    <div
      data-testid="shell-context-probe"
      data-placement-site={placement.site}
      data-exclusion-count={String(
        Object.keys(overlayLayout.exclusionRects).length,
      )}
    />
  )
}

describe('EditorShell', () => {
  it('wires layout and placement contexts in provider order', () => {
    const roomViewRef = createRef<HTMLElement>()
    const selectedItemControlsRef = createRef<HTMLDivElement>()
    const dockedInspectorRef = createRef<HTMLDivElement>()

    expect(() => {
      render(
        <EditorRefsProvider
          value={{ roomViewRef, selectedItemControlsRef, dockedInspectorRef }}
        >
          <EditorShell>
            <ShellContextProbe />
          </EditorShell>
        </EditorRefsProvider>,
      )
    }).not.toThrow()

    const probe = screen.getByTestId('shell-context-probe')
    expect(probe).toHaveAttribute('data-placement-site', 'hidden')
    expect(probe).toHaveAttribute('data-exclusion-count', '0')
  })
})
