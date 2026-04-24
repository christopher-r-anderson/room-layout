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

  const movedRightState = await dragSelectedFurniture(page, {
    x: 320,
    y: 0,
  })
  const movedRightCouch = getItemById(movedRightState, couchId)

  expect(movedRightCouch.position).not.toEqual(
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

  await selectFurnitureById(page, armchair.id)

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
  const approachBaselineArmchair = getItemById(selectedState, armchair.id)

  const approachState = await dragSelectedFurniture(page, firstTowardCouch)
  const approachCouch = getItemById(approachState, couchId)
  const approachArmchair = getItemById(approachState, armchair.id)

  expect(approachState.itemCount).toBe(2)
  expect(approachState.selectedId).toBe(armchair.id)
  expect(approachCouch.position).toEqual(approachBaselineCouch.position)
  expect(approachArmchair.position).not.toEqual(
    approachBaselineArmchair.position,
  )

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

  const collisionState = await dragSelectedFurniture(page, secondTowardCouch)
  const collisionCouch = getItemById(collisionState, couchId)
  const collisionArmchair = getItemById(collisionState, armchair.id)

  expect(collisionState.itemCount).toBe(2)
  expect(collisionState.selectedId).toBe(armchair.id)
  expect(collisionCouch.position).toEqual(approachCouch.position)
  expect(collisionArmchair.position).toEqual(approachArmchair.position)
})
