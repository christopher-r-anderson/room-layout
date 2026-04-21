import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  waitForEditorReady,
} from './support/editor-harness'

function expectUniqueItemIds(itemIds: string[]) {
  expect(new Set(itemIds).size).toBe(itemIds.length)
}

test.setTimeout(60_000)

test('keeps successful adds free of false no-space errors and duplicate ids', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEditorReady(page)

  const firstAddState = await addFurniture(page, 'Leather Couch')
  expect(firstAddState.itemCount).toBe(1)

  await dragSelectedFurniture(page, {
    x: 1200,
    y: 0,
  })

  const secondAddState = await addFurniture(page, 'Leather Couch')
  expect(secondAddState.itemCount).toBe(2)
  expectUniqueItemIds(secondAddState.items.map((item) => item.id))
  await expect(
    page.getByText(
      'No safe placement slot is available for that furniture item.',
    ),
  ).toBeHidden()

  const thirdAddState = await addFurniture(page, 'Leather Armchair')
  expect(thirdAddState.itemCount).toBe(3)
  expectUniqueItemIds(thirdAddState.items.map((item) => item.id))
  await expect(
    page.getByText(
      'No safe placement slot is available for that furniture item.',
    ),
  ).toBeHidden()

  expect(thirdAddState.selectedName).toBe('Leather Armchair')
})
