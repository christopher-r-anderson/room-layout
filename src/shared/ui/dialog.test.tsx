// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

describe('DialogContent', () => {
  it('preserves viewport side gutters when a larger desktop max width is applied', () => {
    render(
      <Dialog open>
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    const content = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })

    expect(content.className).toContain('w-[calc(100%-2rem)]')
    expect(content.className).toContain('max-w-[calc(100%-2rem)]')
    expect(content.className).toContain('sm:max-w-4xl')
  })
})
