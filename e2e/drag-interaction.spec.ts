import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  readSceneState,
  waitForFirstItemPosition,
} from './support/editor-harness'

async function hoverFurnitureById(
  page: Parameters<typeof openEditor>[0],
  itemId: string,
) {
  const state = await readSceneState(page)
  const item = state.items.find((candidate) => candidate.id === itemId)

  if (!item?.pointerTarget) {
    throw new Error(`furniture item ${itemId} does not have a pointer target`)
  }

  const canvasBounds = await page.locator('canvas').boundingBox()

  if (!canvasBounds) {
    throw new Error('canvas bounding box was not available for interaction')
  }

  await page.mouse.move(
    canvasBounds.x + item.pointerTarget.x,
    canvasBounds.y + item.pointerTarget.y,
  )
}

async function movePointerToCanvasBackground(
  page: Parameters<typeof openEditor>[0],
) {
  const canvasBounds = await page.locator('canvas').boundingBox()

  if (!canvasBounds) {
    throw new Error('canvas bounding box was not available for interaction')
  }

  await page.mouse.move(
    canvasBounds.x + canvasBounds.width / 2,
    canvasBounds.y + 24,
  )
}

async function clickCanvasBackground(page: Parameters<typeof openEditor>[0]) {
  const canvasBounds = await page.locator('canvas').boundingBox()

  if (!canvasBounds) {
    throw new Error('canvas bounding box was not available for interaction')
  }

  const candidatePoints: readonly { x: number; y: number }[] = [
    { x: canvasBounds.width / 2, y: 24 },
    { x: 48, y: canvasBounds.height / 2 },
    { x: canvasBounds.width - 48, y: canvasBounds.height / 2 },
    { x: canvasBounds.width / 2, y: canvasBounds.height - 48 },
  ]

  for (const point of candidatePoints) {
    await page.mouse.click(canvasBounds.x + point.x, canvasBounds.y + point.y)

    const state = await readSceneState(page)
    if (state.selectedId === null) {
      return
    }
  }

  throw new Error('unable to find a canvas miss point that clears selection')
}

test('drags selected furniture through the canvas and preserves history undo', async ({
  page,
}) => {
  await openEditor(page)

  const addedState = await addFurniture(page, 'Leather Couch')
  const initialItem = addedState.items[0]

  const draggedState = await dragSelectedFurniture(page, {
    x: 160,
    y: 40,
  })
  const draggedItem = draggedState.items[0]

  expect(draggedState.itemCount).toBe(1)
  expect(draggedState.selectedName).toBe('Leather Couch')
  expect(draggedItem.id).toBe(initialItem.id)
  expect(draggedItem.position).not.toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Undo' }).click()
  const afterUndo = await waitForFirstItemPosition(page, initialItem.position)
  expect(afterUndo).toMatchObject({
    itemCount: 1,
    selectedName: 'Leather Couch',
  })
  expect(afterUndo.items[0]?.position).toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedo = await waitForFirstItemPosition(page, draggedItem.position)
  expect(afterRedo).toMatchObject({
    itemCount: 1,
    selectedName: 'Leather Couch',
  })
  expect(afterRedo.items[0]?.position).toEqual(draggedItem.position)
})

test('keeps selected and preview states independent across hover and selection changes', async ({
  page,
}) => {
  await openEditor(page)

  const firstAddState = await addFurniture(page, 'Leather Couch')
  const couchId = firstAddState.items[0]?.id

  if (!couchId) {
    throw new Error('expected couch item to exist after adding furniture')
  }

  const secondAddState = await addFurniture(page, 'End Table')
  const tableId = secondAddState.items.find((item) => item.id !== couchId)?.id

  if (!tableId) {
    throw new Error('expected table item to exist after adding furniture')
  }

  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(tableId)

  const couchOutlinerButton = page.getByRole('button', {
    name: /^Leather Couch/i,
  })
  await couchOutlinerButton.hover()

  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBe(couchId)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(tableId)

  await movePointerToCanvasBackground(page)
  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBeNull()

  await couchOutlinerButton.click()
  await page.getByRole('button', { name: /^End Table/i }).hover()

  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(couchId)
  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBe(tableId)
})

test('clears preview state on background click when furniture is not selected', async ({
  page,
}) => {
  await openEditor(page)

  const addState = await addFurniture(page, 'Leather Couch')
  const couchId = addState.items[0]?.id

  if (!couchId) {
    throw new Error('expected couch item to exist after adding furniture')
  }

  await movePointerToCanvasBackground(page)
  await clickCanvasBackground(page)

  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBeNull()
  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBeNull()

  await hoverFurnitureById(page, couchId)
  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBe(couchId)

  await clickCanvasBackground(page)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBeNull()
  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBeNull()
})
