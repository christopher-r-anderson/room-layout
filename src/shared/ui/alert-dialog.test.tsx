// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

describe('AlertDialogContent', () => {
  it('exposes the size variant and keeps the mobile viewport gutter', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Delete item</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    )

    const content = screen.getByRole('alertdialog', { name: 'Delete item' })

    // The size prop reaches the DOM for the CSS size variants to key off.
    expect(content).toHaveAttribute('data-size', 'sm')
    // The mobile side gutter is always applied so content never hits the edges.
    expect(content.className).toContain('w-[calc(100%-2rem)]')
  })
})
