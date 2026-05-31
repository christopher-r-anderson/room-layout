// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

describe('AlertDialogContent', () => {
  it('keeps viewport side gutters alongside size-specific max widths', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Delete item</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    )

    const content = screen.getByRole('alertdialog', { name: 'Delete item' })

    expect(content.className).toContain('w-[calc(100%-2rem)]')
    expect(content.className).toContain('max-w-[calc(100%-2rem)]')
    expect(content.className).toContain('data-[size=sm]:max-w-64')
  })
})
