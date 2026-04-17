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

test('blocks dragging one furniture item through another without adding history noise', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const addedCouchState = await addFurniture(page, 'Leather Couch')
  const couchId = addedCouchState.items[0]?.id

  if (!couchId) {
    throw new Error('expected the added couch to exist')
  }

  const movedLeftState = await dragSelectedFurniture(page, {
    x: -1200,
    y: 0,
  })
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

  await selectFurnitureById(page, couchId)

  const selectedCouchState = await readSceneState(page)
  const selectedCouch = getItemById(selectedCouchState, couchId)

  if (!selectedCouch.pointerTarget) {
    throw new Error('expected the selected couch to have a pointer target')
  }

  const towardArmchair = {
    x: armchair.pointerTarget.x - selectedCouch.pointerTarget.x,
    y: armchair.pointerTarget.y - selectedCouch.pointerTarget.y,
  }

  const beforeBlockedDrag = await readSceneState(page)
  const blockedBaselineCouch = getItemById(beforeBlockedDrag, couchId)
  const blockedBaselineArmchair = getItemById(beforeBlockedDrag, armchair.id)

  const collisionState = await dragSelectedFurniture(page, towardArmchair)
  const collisionCouch = getItemById(collisionState, couchId)
  const collisionArmchair = getItemById(collisionState, armchair.id)

  expect(collisionState.itemCount).toBe(2)
  expect(collisionState.selectedId).toBe(couchId)
  expect(collisionCouch.position).toEqual(blockedBaselineCouch.position)
  expect(collisionArmchair.position).toEqual(blockedBaselineArmchair.position)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(1)

  const afterUndo = await readSceneState(page)
  expect(afterUndo.selectedId).toBe(couchId)
  expect(getItemById(afterUndo, couchId).position).toEqual(
    movedLeftCouch.position,
  )

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect.poll(async () => (await readSceneState(page)).itemCount).toBe(2)

  const afterRedo = await readSceneState(page)
  expect(afterRedo.itemCount).toBe(2)
  expect(afterRedo.selectedId).toBe(couchId)
  expect(getItemById(afterRedo, couchId).position).toEqual(
    movedLeftCouch.position,
  )
  expect(getItemById(afterRedo, armchair.id).position).toEqual(
    blockedBaselineArmchair.position,
  )
})
