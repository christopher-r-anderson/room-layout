import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  readSceneState,
  selectFurnitureById,
  type BrowserSceneState,
} from './support/editor-harness'

function getItemById(state: BrowserSceneState, itemId: string) {
  const item = state.items.find((candidate) => candidate.id === itemId)

  if (!item) {
    throw new Error(`expected furniture item ${itemId} to exist`)
  }

  return item
}

test('blocks pointer dragging one furniture item through another', async ({
  page,
}) => {
  await openEditor(page)

  const addedCouchState = await addFurniture(page, 'Leather Couch')
  const couchId = addedCouchState.items[0]?.id

  if (!couchId) {
    throw new Error('expected the added couch to exist')
  }

  // Keep the interaction lane away from right-side overlay controls.
  const movedLeftState = await dragSelectedFurniture(
    page,
    {
      x: -220,
      y: 0,
    },
    undefined,
    { hideOverlays: true },
  )
  const movedLeftCouch = getItemById(movedLeftState, couchId)

  expect(movedLeftCouch.position).not.toEqual(
    getItemById(addedCouchState, couchId).position,
  )

  const addedArmchairState = await addFurniture(page, 'Leather Armchair')
  const armchair = addedArmchairState.items.find(
    (item) => item.id !== couchId && item.name === 'Leather Armchair',
  )

  if (!armchair?.pointerTarget) {
    throw new Error(
      'expected the added armchair to exist with a pointer target',
    )
  }

  await selectFurnitureById(page, armchair.id, { hideOverlays: true })

  const selectedState = await readSceneState(page)
  const selectedCouch = getItemById(selectedState, couchId)
  const selectedArmchair = getItemById(selectedState, armchair.id)

  if (!selectedCouch.pointerTarget) {
    throw new Error('expected the couch to have a pointer target')
  }

  if (!selectedArmchair.pointerTarget) {
    throw new Error('expected the selected armchair to have a pointer target')
  }

  const firstTowardCouch = {
    x: (selectedCouch.pointerTarget.x - selectedArmchair.pointerTarget.x) * 0.6,
    y: (selectedCouch.pointerTarget.y - selectedArmchair.pointerTarget.y) * 0.6,
  }

  const approachBaselineCouch = getItemById(selectedState, couchId)

  const approachState = await dragSelectedFurniture(
    page,
    firstTowardCouch,
    undefined,
    { hideOverlays: true },
  )
  const approachCouch = getItemById(approachState, couchId)
  const approachArmchair = getItemById(approachState, armchair.id)

  expect(approachState.itemCount).toBe(2)
  expect(approachState.selectedId).toBe(armchair.id)
  expect(approachCouch.position).toEqual(approachBaselineCouch.position)

  if (!approachArmchair.pointerTarget) {
    throw new Error('expected the approached armchair to have a pointer target')
  }

  if (!approachCouch.pointerTarget) {
    throw new Error('expected the couch to keep a pointer target')
  }

  const secondTowardCouch = {
    x: (approachCouch.pointerTarget.x - approachArmchair.pointerTarget.x) * 0.9,
    y: (approachCouch.pointerTarget.y - approachArmchair.pointerTarget.y) * 0.9,
  }

  const collisionState = await dragSelectedFurniture(
    page,
    secondTowardCouch,
    undefined,
    { hideOverlays: true },
  )
  const collisionCouch = getItemById(collisionState, couchId)
  const collisionArmchair = getItemById(collisionState, armchair.id)
  const approachDeltaX =
    approachArmchair.position[0] - approachCouch.position[0]
  const approachDeltaZ =
    approachArmchair.position[2] - approachCouch.position[2]
  const dominantAxis =
    Math.abs(approachDeltaX) >= Math.abs(approachDeltaZ) ? 0 : 2
  const approachDelta =
    approachArmchair.position[dominantAxis] -
    approachCouch.position[dominantAxis]
  const collisionDelta =
    collisionArmchair.position[dominantAxis] -
    collisionCouch.position[dominantAxis]

  expect(collisionState.itemCount).toBe(2)
  expect(collisionState.selectedId).toBe(armchair.id)
  expect(collisionCouch.position).toEqual(approachCouch.position)
  expect(Math.sign(collisionDelta)).toBe(Math.sign(approachDelta))
  expect(Math.abs(collisionDelta)).toBeLessThanOrEqual(Math.abs(approachDelta))
})
