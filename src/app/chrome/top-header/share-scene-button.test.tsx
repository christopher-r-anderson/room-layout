// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShareSceneButton } from './share-scene-button'

describe('ShareSceneButton', () => {
  it('shows shared feedback when native share succeeds', async () => {
    const user = userEvent.setup()
    const onShareSceneUrl = vi
      .fn<() => Promise<'shared' | 'copied' | null>>()
      .mockResolvedValue('shared')

    render(<ShareSceneButton onShareSceneUrl={onShareSceneUrl} />)

    await user.click(screen.getByRole('button', { name: 'Share room layout' }))

    expect(onShareSceneUrl).toHaveBeenCalledOnce()
    expect(screen.getByText('Shared')).toBeInTheDocument()
  })

  it('shows copied feedback when clipboard fallback succeeds', async () => {
    const user = userEvent.setup()
    const onShareSceneUrl = vi
      .fn<() => Promise<'shared' | 'copied' | null>>()
      .mockResolvedValue('copied')

    render(<ShareSceneButton onShareSceneUrl={onShareSceneUrl} />)

    await user.click(screen.getByRole('button', { name: 'Share room layout' }))

    expect(onShareSceneUrl).toHaveBeenCalledOnce()
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('ignores repeat clicks while a share attempt is pending', async () => {
    const user = userEvent.setup()
    let resolveShare!: (value: 'shared' | 'copied' | null) => void
    const pendingShare = new Promise<'shared' | 'copied' | null>((resolve) => {
      resolveShare = resolve
    })
    const onShareSceneUrl = vi.fn(() => pendingShare)

    render(<ShareSceneButton onShareSceneUrl={onShareSceneUrl} />)

    const button = screen.getByRole('button', { name: 'Share room layout' })
    await user.click(button)
    await user.click(button)

    expect(onShareSceneUrl).toHaveBeenCalledOnce()
    expect(button).toBeDisabled()

    resolveShare('shared')

    expect(await screen.findByText('Shared')).toBeInTheDocument()
  })

  it('re-enables the button if the share callback rejects', async () => {
    const user = userEvent.setup()
    const onShareSceneUrl = vi
      .fn<() => Promise<'shared' | 'copied' | null>>()
      .mockRejectedValue(new Error('share failed'))

    render(<ShareSceneButton onShareSceneUrl={onShareSceneUrl} />)

    const button = screen.getByRole('button', { name: 'Share room layout' })
    await user.click(button)

    await waitFor(() => {
      expect(button).toBeEnabled()
    })
    expect(screen.queryByText('Shared')).not.toBeInTheDocument()
    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
  })

  it('supports explicit label visibility and toolbar sizing', () => {
    render(<ShareSceneButton onShareSceneUrl={vi.fn()} size="toolbar" />)

    const button = screen.getByRole('button', { name: 'Share room layout' })
    const label = screen.getByText('Share')

    expect(label.className).not.toContain('hidden')
    expect(button.className).toContain('h-9')
  })
})
