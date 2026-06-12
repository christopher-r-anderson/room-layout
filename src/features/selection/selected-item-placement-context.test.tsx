// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SelectedItemPlacement } from './selected-item-placement.types'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { SelectedItemPlacementProvider } from './selected-item-placement-provider'

describe('SelectedItemPlacementContext', () => {
  it('useSelectedItemPlacement throws outside the provider', () => {
    expect(() => renderHook(() => useSelectedItemPlacement())).toThrow(
      /must be used inside SelectedItemPlacementProvider/,
    )
  })

  it('useSelectedItemActionsSizeRef throws outside the provider', () => {
    expect(() => renderHook(() => useSelectedItemActionsSizeRef())).toThrow(
      /must be used inside SelectedItemPlacementProvider/,
    )
  })

  it('exposes the provided placement and actionsSizeRef', () => {
    const placement: SelectedItemPlacement = {
      site: 'hidden',
      reason: 'no-selection',
    }
    const actionsSizeRef = (_element: HTMLElement | null) => {
      void _element
    }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SelectedItemPlacementProvider value={{ placement, actionsSizeRef }}>
        {children}
      </SelectedItemPlacementProvider>
    )

    const { result: placementResult } = renderHook(
      () => useSelectedItemPlacement(),
      { wrapper },
    )
    const { result: refResult } = renderHook(
      () => useSelectedItemActionsSizeRef(),
      { wrapper },
    )

    expect(placementResult.current).toBe(placement)
    expect(refResult.current).toBe(actionsSizeRef)
  })
})
