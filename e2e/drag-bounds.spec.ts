import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
} from './support/editor-harness'

// The 6m room spans x in [-3, 3]; furniture clamps to stay inside.
const ROOM_HALF_WIDTH = 3

test('keeps dragged furniture inside room bounds near the wall', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Armchair')
  const initialItem = addedState.items[0]

  const draggedState = await dragSelectedFurniture(
    page,
    {
      x: 1_600,
      y: 0,
    },
    undefined,
    { hideOverlays: true },
  )
  const draggedItem = draggedState.items[0]

  expect(draggedState.itemCount).toBe(1)
  expect(draggedState.selectedName).toBe('Leather Armchair')
  expect(draggedItem.id).toBe(initialItem.id)
  // The drag pushed hard toward the +X wall: the item moved that way but clamped
  // to stay inside the room. The exact clamp coordinate is pinned by the
  // clampToBounds / wall-clearance unit tests, not re-verified here.
  expect(draggedItem.position[0]).toBeGreaterThan(initialItem.position[0])
  expect(draggedItem.position[0]).toBeLessThan(ROOM_HALF_WIDTH)
})
