// @vitest-environment jsdom

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { EnvironmentButton } from './environment-button'
import { EnvironmentDialog } from './environment-dialog'

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
    {
      id: 'warm-white',
      label: 'Warm White',
      color: 0xf7f3ea,
    },
  ]
}

describe('EnvironmentDialog', () => {
  it('opens from its trigger and returns focus when closed', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [open, setOpen] = React.useState(false)

      return (
        <EnvironmentDialog
          open={open}
          onOpenChange={setOpen}
          triggerButton={<EnvironmentButton />}
          floorFinishId="wood-floor"
          floorFinishLoading={false}
          floorFinishes={createFloorOptions()}
          onFloorFinishChange={vi.fn()}
          wallFinishId="light-gray"
          wallFinishes={createWallOptions()}
          onWallFinishChange={vi.fn()}
        />
      )
    }

    render(<TestHarness />)

    const trigger = screen.getByRole('button', { name: 'Environment' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Environment' })
    expect(dialog).toBeVisible()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Environment' }),
      ).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('forwards environment control changes through the extracted form surface', () => {
    const onFloorFinishChange = vi.fn()
    const onWallFinishChange = vi.fn()

    render(
      <EnvironmentDialog
        open={true}
        onOpenChange={vi.fn()}
        triggerButton={<EnvironmentButton />}
        floorFinishId="wood-floor"
        floorFinishLoading={true}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={onWallFinishChange}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Floor Finish' }),
    ).toHaveAttribute('aria-busy', 'true')

    fireEvent.click(
      screen.getByRole('button', { name: 'choose-concrete-floor' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'choose-warm-white' }))

    expect(onFloorFinishChange).toHaveBeenCalledWith('concrete-floor')
    expect(onWallFinishChange).toHaveBeenCalledWith('warm-white')
  })
})
