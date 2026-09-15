// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { SelectedItemInteractionProvider } from './selected-item-interaction-provider'
import type { ReactNode } from 'react'

describe('SelectedItemInteractionContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSelectedItemInteraction())).toThrow(
      /must be used inside SelectedItemInteractionProvider/,
    )
  })

  it('prepare followed by consume returns true and clears the flag', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelectedItemInteractionProvider>
        {children}
      </SelectedItemInteractionProvider>
    )

    const { result } = renderHook(() => useSelectedItemInteraction(), {
      wrapper,
    })

    act(() => {
      result.current.prepareDeleteBlurSuppression()
    })

    let consumed: boolean | undefined
    act(() => {
      consumed = result.current.consumeBlurCommitSuppression()
    })

    expect(consumed).toBe(true)

    let consumedAgain: boolean | undefined
    act(() => {
      consumedAgain = result.current.consumeBlurCommitSuppression()
    })

    expect(consumedAgain).toBe(false)
  })

  it('consume without prepare returns false', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelectedItemInteractionProvider>
        {children}
      </SelectedItemInteractionProvider>
    )

    const { result } = renderHook(() => useSelectedItemInteraction(), {
      wrapper,
    })

    let consumed: boolean | undefined
    act(() => {
      consumed = result.current.consumeBlurCommitSuppression()
    })

    expect(consumed).toBe(false)
  })
})
