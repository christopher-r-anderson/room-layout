import { expect, test } from '@playwright/test'
import {
  addFurniture,
  readSceneState,
  removeSelectedFurniture,
  rotateSelectionRight,
  waitForEditorReady,
} from '../support/editor-harness'

test('captures a baseline add rotate remove interaction trace', async ({
  page,
}) => {
  await page.goto('/')

  await waitForEditorReady(page)
  await addFurniture(page, 'Leather Couch')
  const beforeRotate = await readSceneState(page)
  await rotateSelectionRight(page)
  const afterRotate = await readSceneState(page)
  await removeSelectedFurniture(page)

  expect(beforeRotate.items[0]?.rotationY).not.toBe(
    afterRotate.items[0]?.rotationY,
  )
})
