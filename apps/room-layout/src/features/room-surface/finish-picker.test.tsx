// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinishPicker } from './finish-picker'

const OPTIONS = [
  { id: 'a', label: 'Option A' },
  { id: 'b', label: 'Option B' },
]

function renderPicker(props: Partial<Parameters<typeof FinishPicker>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn()

  render(
    <FinishPicker
      label="Wall finish"
      description="Pick a finish"
      name="wall-finish"
      options={OPTIONS}
      selectedId="a"
      onChange={onChange}
      cardClassName="flex items-center gap-3 p-3"
      renderCard={(item) => <span>{item.label} card</span>}
      {...props}
    />,
  )

  return { onChange }
}

describe('FinishPicker', () => {
  it('labels the group and reflects the selected option', () => {
    renderPicker()

    expect(
      screen.getByRole('group', { name: 'Wall finish' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Option A' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Option B' })).not.toBeChecked()
  })

  it('forwards the chosen option id to onChange', () => {
    const { onChange } = renderPicker()

    fireEvent.click(screen.getByRole('radio', { name: 'Option B' }))

    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('renders the supplied card content and header accessory', () => {
    renderPicker({ headerAccessory: <span>Updating</span> })

    expect(screen.getByText('Option A card')).toBeInTheDocument()
    expect(screen.getByText('Updating')).toBeInTheDocument()
  })
})
