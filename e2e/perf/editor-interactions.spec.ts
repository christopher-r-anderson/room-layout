import { expect, test } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  deleteSelectedFurniture,
  rotateSelectionRight,
} from '../support/editor-harness'

test('captures a baseline add rotate delete interaction trace', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')
  const beforeRotate = await readSceneState(page)
  await rotateSelectionRight(page)
  const afterRotate = await readSceneState(page)
  await deleteSelectedFurniture(page)

  expect(beforeRotate.items[0]?.rotationY).not.toBe(
    afterRotate.items[0]?.rotationY,
  )
})
