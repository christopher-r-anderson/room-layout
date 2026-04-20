import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  readSceneState,
  selectFurnitureById,
  waitForEditorReady,
  type BrowserSceneState,
} from './support/editor-harness'

function getItemById(state: BrowserSceneState, itemId: string) {
  const item = state.items.find((candidate) => candidate.id === itemId)

  if (!item) {
    throw new Error(`expected furniture item ${itemId} to exist`)
  }

  return item
}

test.setTimeout(60_000)

test('blocks pointer dragging one furniture item through another', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const addedCouchState = await addFurniture(page, 'Leather Couch')
  const couchId = addedCouchState.items[0]?.id

  if (!couchId) {
    throw new Error('expected the added couch to exist')
  }

  const movedRightState = await dragSelectedFurniture(page, {
    x: 850,
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

  const selectedArmchairState = await readSceneState(page)
  const selectedCouch = getItemById(selectedArmchairState, couchId)
  const selectedArmchair = getItemById(selectedArmchairState, armchair.id)

  if (!selectedCouch.pointerTarget) {
    throw new Error('expected the couch to have a pointer target')
  }

  if (!selectedArmchair.pointerTarget) {
    throw new Error('expected the selected armchair to have a pointer target')
  }

  const towardCouch = {
    x: selectedCouch.pointerTarget.x - selectedArmchair.pointerTarget.x,
    y: selectedCouch.pointerTarget.y - selectedArmchair.pointerTarget.y,
  }

  const beforeApproachDrag = await readSceneState(page)
  const approachBaselineCouch = getItemById(beforeApproachDrag, couchId)
  const approachBaselineArmchair = getItemById(beforeApproachDrag, armchair.id)

  const approachState = await dragSelectedFurniture(page, towardCouch)
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
    x: approachCouch.pointerTarget.x - approachArmchair.pointerTarget.x,
    y: approachCouch.pointerTarget.y - approachArmchair.pointerTarget.y,
  }

  const beforeBlockedDrag = await readSceneState(page)
  const blockedBaselineCouch = getItemById(beforeBlockedDrag, couchId)
  const blockedBaselineArmchair = getItemById(beforeBlockedDrag, armchair.id)

  const collisionState = await dragSelectedFurniture(page, secondTowardCouch)
  const collisionCouch = getItemById(collisionState, couchId)
  const collisionArmchair = getItemById(collisionState, armchair.id)

  expect(collisionState.itemCount).toBe(2)
  expect(collisionState.selectedId).toBe(armchair.id)
  expect(collisionCouch.position).toEqual(blockedBaselineCouch.position)
  expect(collisionArmchair.position).toEqual(blockedBaselineArmchair.position)
})
