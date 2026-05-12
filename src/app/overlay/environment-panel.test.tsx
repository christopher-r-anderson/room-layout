// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { EnvironmentPanel } from './environment-panel'
import { loadBooleanPreference } from '@/lib/ui/storage'

const ENVIRONMENT_PANEL_EXPANDED_PREFERENCE_KEY = 'environment-panel-expanded'

vi.mock('@/components/ui/select', () => {
  function collectItemValues(
    node: React.ReactNode,
    values: string[] = [],
  ): string[] {
    React.Children.forEach(node, (child) => {
      if (
        !React.isValidElement<{
          value?: string
          children?: React.ReactNode
        }>(child)
      ) {
        return
      }

      const childProps = child.props

      if (typeof childProps.value === 'string') {
        values.push(childProps.value)
      }

      if (childProps.children) {
        collectItemValues(childProps.children, values)
      }
    })

    return values
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange: (value: string) => void
      children: React.ReactNode
    }) => {
      const values = collectItemValues(children)

      return (
        <div data-current-value={value}>
          {children}
          <div>
            {values.map((itemValue) => (
              <button
                key={itemValue}
                type="button"
                onClick={() => {
                  onValueChange(itemValue)
                }}
              >
                choose-{itemValue}
              </button>
            ))}
          </div>
        </div>
      )
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectGroup: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectTrigger: ({
      children,
      ...props
    }: {
      children: React.ReactNode
      id?: string
      className?: string
      'aria-labelledby'?: string
      'aria-busy'?: boolean
    }) => <button {...props}>{children}</button>,
    SelectValue: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  }
})

function createFloorOptions(): FloorFinishOption[] {
  return [
    {
      id: 'wood-floor',
      label: 'Wood',
      diffusePath: '/textures/wood.jpg',
      normalPath: '/textures/wood-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
    {
      id: 'concrete-floor',
      label: 'Concrete',
      diffusePath: '/textures/concrete.jpg',
      normalPath: '/textures/concrete-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
  ]
}

function createWallOptions(): WallFinishOption[] {
  return [
    {
      id: 'light-gray',
      label: 'Light Gray',
      color: 0xf5f5f5,
    },
  ]
}

describe('EnvironmentPanel', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts expanded and collapses on toggle, saving the preference', async () => {
    const user = userEvent.setup()

    render(
      <EnvironmentPanel
        floorFinishId="wood-floor"
        floorFinishLoading={false}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={vi.fn()}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={vi.fn()}
      />,
    )

    // Panel should be expanded initially, showing the selects
    expect(
      screen.getByRole('button', { name: 'choose-concrete-floor' }),
    ).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Toggle environment panel' }),
    )

    // After collapse, selects should not be visible
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'choose-concrete-floor' }),
      ).not.toBeInTheDocument()
    })

    // Preference should be saved as collapsed
    expect(
      loadBooleanPreference(ENVIRONMENT_PANEL_EXPANDED_PREFERENCE_KEY, true),
    ).toBe(false)
  })

  it('marks floor finish control as busy while floor textures are loading', () => {
    render(
      <EnvironmentPanel
        floorFinishId="wood-floor"
        floorFinishLoading={true}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={vi.fn()}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={vi.fn()}
      />,
    )

    const floorTrigger = screen.getByRole('button', { name: 'Floor Finish' })
    expect(floorTrigger).toHaveAttribute('aria-busy', 'true')
  })

  it('forwards select changes to floor and wall handlers', () => {
    const onFloorFinishChange = vi.fn()
    const onWallFinishChange = vi.fn()

    render(
      <EnvironmentPanel
        floorFinishId="wood-floor"
        floorFinishLoading={false}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={onWallFinishChange}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'choose-concrete-floor' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'choose-light-gray' }))

    expect(onFloorFinishChange).toHaveBeenCalledWith('concrete-floor')
    expect(onWallFinishChange).toHaveBeenCalledWith('light-gray')
  })
})
