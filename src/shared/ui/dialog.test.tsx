// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { describe, expect, it } from 'vitest'

import { i18n } from '@/shared/i18n/i18n'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

describe('DialogContent', () => {
  it('preserves viewport side gutters when a larger desktop max width is applied', () => {
    render(
      <I18nProvider i18n={i18n}>
        <Dialog open>
          <DialogContent className="sm:max-w-4xl">
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogContent>
        </Dialog>
      </I18nProvider>,
    )

    const content = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })

    // Guards the cn()/twMerge composition: a caller-supplied desktop max-width
    // must not strip DialogContent's base mobile side gutters. The classes are
    // the unit under test here, so asserting them directly is intentional.
    expect(content.className).toContain('w-[calc(100%-2rem)]')
    expect(content.className).toContain('max-w-[calc(100%-2rem)]')
    expect(content.className).toContain('sm:max-w-4xl')
  })
})
