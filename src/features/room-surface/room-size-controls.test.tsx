// @vitest-environment jsdom
import { fireEvent, render, screen } from '@/test/render'
import { beforeEach, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { DEFAULT_ROOM_SIZE } from '@/domain/geometry/room-metrics'
import { RoomSizeControls } from '@/features/room-surface/room-size-controls'
import { appToastManager } from '@/core/stores/feedback-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { resetSceneSessionStore } from '@/core/stores/scene-session-store'
import { makeFurnitureItem } from '@/test/support/furniture'

beforeEach(() => {
  resetSceneDocumentStore()
  resetSceneSessionStore()
  vi.restoreAllMocks()
})

function widthInput() {
  return screen.getByLabelText('Width (m)')
}

it('commits a typed width on Enter', () => {
  render(<RoomSizeControls />)

  fireEvent.change(widthInput(), { target: { value: '8.5' } })
  fireEvent.keyDown(widthInput(), { key: 'Enter' })

  expect(useSceneDocumentStore.getState().roomSize).toEqual({
    width: 8.5,
    depth: 6,
    height: 2.5,
  })
  expect(widthInput()).toHaveValue('8.5')
})

it('commits on blur and reverts the draft on Escape', () => {
  render(<RoomSizeControls />)

  fireEvent.change(widthInput(), { target: { value: '4' } })
  fireEvent.blur(widthInput())
  expect(useSceneDocumentStore.getState().roomSize.width).toBe(4)

  fireEvent.change(widthInput(), { target: { value: '9' } })
  fireEvent.keyDown(widthInput(), { key: 'Escape' })

  expect(widthInput()).toHaveValue('4')
  expect(useSceneDocumentStore.getState().roomSize.width).toBe(4)
})

it('rejects an out-of-range width with a field error and leaves the size unchanged', () => {
  render(<RoomSizeControls />)

  fireEvent.change(widthInput(), { target: { value: '25' } })
  fireEvent.keyDown(widthInput(), { key: 'Enter' })

  expect(useSceneDocumentStore.getState().roomSize).toEqual(DEFAULT_ROOM_SIZE)
  expect(widthInput()).toHaveAttribute('aria-invalid', 'true')
  expect(
    screen.getByText('Width (m) must be between 2 and 20.'),
  ).toBeInTheDocument()
})

it('rejects a non-numeric value with a field error', () => {
  render(<RoomSizeControls />)

  fireEvent.change(widthInput(), { target: { value: 'wide' } })
  fireEvent.keyDown(widthInput(), { key: 'Enter' })

  expect(widthInput()).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('Enter a number for Width (m).')).toBeInTheDocument()
})

it('warns when a shrink leaves items outside and offers the fix action', () => {
  const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')
  const nearWall = makeFurnitureItem({ id: 'near-wall', position: [2.5, 0, 0] })
  sceneDocumentActions.setHistory(createHistoryState([nearWall]))

  render(<RoomSizeControls />)

  fireEvent.change(widthInput(), { target: { value: '4' } })
  fireEvent.keyDown(widthInput(), { key: 'Enter' })

  // The shrink itself never moves the item.
  expect(useSceneDocumentStore.getState().history.present[0].position).toEqual([
    2.5, 0, 0,
  ])
  expect(addToast).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'warning',
      title: '1 item is outside the room walls.',
    }),
  )
  expect(
    screen.getByText('1 item is outside the room walls.'),
  ).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Move items inside' }))

  expect(useSceneDocumentStore.getState().history.present[0].position).toEqual([
    1.5, 0, 0,
  ])
  expect(addToast).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'success',
      title: 'Moved 1 item inside the room.',
    }),
  )
  expect(
    screen.queryByRole('button', { name: 'Move items inside' }),
  ).not.toBeInTheDocument()
})
