// @vitest-environment jsdom

import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shareScene } from '@/core/operations/share-scene'
import { ShareSceneButton } from './share-scene-button'

vi.mock('@/core/operations/share-scene', () => ({
  shareScene: vi.fn(),
}))

const shareSceneMock = vi.mocked(shareScene)

describe('ShareSceneButton', () => {
  beforeEach(() => {
    shareSceneMock.mockReset()
  })

  it('shows shared feedback when native share succeeds', async () => {
    const user = userEvent.setup()
    shareSceneMock.mockResolvedValue('shared')

    render(<ShareSceneButton />)

    await user.click(screen.getByRole('button', { name: 'Share room layout' }))

    expect(shareSceneMock).toHaveBeenCalledOnce()
    expect(screen.getByText('Shared')).toBeInTheDocument()
  })

  it('shows copied feedback when clipboard fallback succeeds', async () => {
    const user = userEvent.setup()
    shareSceneMock.mockResolvedValue('copied')

    render(<ShareSceneButton />)

    await user.click(screen.getByRole('button', { name: 'Share room layout' }))

    expect(shareSceneMock).toHaveBeenCalledOnce()
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('ignores repeat clicks while a share attempt is pending', async () => {
    const user = userEvent.setup()
    let resolveShare!: (value: 'shared' | 'copied' | null) => void
    const pendingShare = new Promise<'shared' | 'copied' | null>((resolve) => {
      resolveShare = resolve
    })
    shareSceneMock.mockReturnValue(pendingShare)

    render(<ShareSceneButton />)

    const button = screen.getByRole('button', { name: 'Share room layout' })
    await user.click(button)
    await user.click(button)

    expect(shareSceneMock).toHaveBeenCalledOnce()
    // Stays focusable while pending so it keeps its place in the toolbar's
    // roving sequence instead of blurring.
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()

    resolveShare('shared')

    expect(await screen.findByText('Shared')).toBeInTheDocument()
  })

  it('forwards injected toolbar props to the underlying button', () => {
    render(<ShareSceneButton tabIndex={-1} data-testid="share-item" />)

    const button = screen.getByRole('button', { name: 'Share room layout' })
    expect(button).toHaveAttribute('tabindex', '-1')
    expect(button).toHaveAttribute('data-testid', 'share-item')
  })

  it('runs an injected click handler and still shares', async () => {
    const user = userEvent.setup()
    shareSceneMock.mockResolvedValue('shared')
    const onClick = vi.fn()

    render(<ShareSceneButton onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: 'Share room layout' }))

    expect(onClick).toHaveBeenCalledOnce()
    expect(shareSceneMock).toHaveBeenCalledOnce()
  })

  it('does not share when an injected handler cancels the click', async () => {
    const user = userEvent.setup()
    shareSceneMock.mockResolvedValue('shared')

    render(
      <ShareSceneButton
        onClick={(event) => {
          event.preventDefault()
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Share room layout' }))

    expect(shareSceneMock).not.toHaveBeenCalled()
  })

  it('recovers if the share attempt rejects', async () => {
    const user = userEvent.setup()
    shareSceneMock.mockRejectedValue(new Error('share failed'))

    render(<ShareSceneButton />)

    const button = screen.getByRole('button', { name: 'Share room layout' })
    await user.click(button)

    await waitFor(() => {
      expect(button).not.toHaveAttribute('aria-disabled', 'true')
    })
    expect(screen.queryByText('Shared')).not.toBeInTheDocument()
    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
  })
})
