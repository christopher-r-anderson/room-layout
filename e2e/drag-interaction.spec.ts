import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  readSceneState,
  selectOutlinerItemByKeyboard,
  withOverlaysHidden,
  waitForFirstItemPosition,
} from './support/editor-harness'

async function hoverFurnitureById(
  page: Parameters<typeof openEditor>[0],
  itemId: string,
) {
  await withOverlaysHidden(page, async () => {
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
  })
}

async function movePointerToCanvasBackground(
  page: Parameters<typeof openEditor>[0],
) {
  await withOverlaysHidden(page, async () => {
    const canvasBounds = await page.locator('canvas').boundingBox()

    if (!canvasBounds) {
      throw new Error('canvas bounding box was not available for interaction')
    }

    await page.mouse.move(
      canvasBounds.x + canvasBounds.width / 2,
      canvasBounds.y + 24,
    )
  })
}

async function clickCanvasBackground(page: Parameters<typeof openEditor>[0]) {
  await withOverlaysHidden(page, async () => {
    const canvas = page.locator('canvas')
    const canvasBounds = await page.locator('canvas').boundingBox()

    if (!canvasBounds) {
      throw new Error('canvas bounding box was not available for interaction')
    }

    const candidatePoints: readonly { x: number; y: number }[] = [
      { x: canvasBounds.width * 0.45, y: 40 },
      { x: canvasBounds.width * 0.55, y: 40 },
      { x: canvasBounds.width * 0.7, y: 72 },
      { x: canvasBounds.width * 0.82, y: 120 },
    ]

    for (const point of candidatePoints) {
      await canvas.click({ position: { x: point.x, y: point.y } })

      const state = await readSceneState(page)
      if (state.selectedId === null) {
        return
      }
    }

    throw new Error('unable to find a canvas miss point that clears selection')
  })
}

test('drags selected furniture through the canvas and preserves history undo', async ({
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
  expect(draggedItem.position).not.toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Undo' }).click()
  const afterUndo = await waitForFirstItemPosition(page, initialItem.position)
  expect(afterUndo).toMatchObject({
    itemCount: 1,
    selectedName: 'Leather Armchair',
  })
  expect(afterUndo.items[0]?.position).toEqual(initialItem.position)

  await page.getByRole('button', { name: 'Redo' }).click()
  const afterRedo = await waitForFirstItemPosition(page, draggedItem.position)
  expect(afterRedo).toMatchObject({
    itemCount: 1,
    selectedName: 'Leather Armchair',
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
  // React's synthetic enter/leave handling in this surface responds to the
  // over/out transition here
  // dispatchEvent('pointerenter') does not update preview state
  await couchOutlinerButton.dispatchEvent('pointerover')

  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBe(couchId)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(tableId)

  await couchOutlinerButton.dispatchEvent('pointerout')
  await expect
    .poll(async () => (await readSceneState(page)).previewedId)
    .toBeNull()

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  await page
    .getByRole('button', { name: /^End Table/i })
    .dispatchEvent('pointerover')

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

test('prevents the browser context menu on canvas right-click', async ({
  page,
}) => {
  await openEditor(page)

  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()

  if (!box) {
    throw new Error('canvas bounding box was not available for interaction')
  }

  // Record the real contextmenu event. The window bubble-phase listener fires
  // last, so defaultPrevented reflects whether the app's handler suppressed the
  // native menu.
  await page.evaluate(() => {
    const w = window as typeof window & { __ctxPrevented?: boolean }
    w.__ctxPrevented = undefined
    window.addEventListener(
      'contextmenu',
      (event) => {
        w.__ctxPrevented = event.defaultPrevented
      },
      { once: true },
    )
  })

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  })

  const prevented = await page.evaluate(
    () =>
      (window as typeof window & { __ctxPrevented?: boolean }).__ctxPrevented,
  )
  expect(prevented).toBe(true)
})
