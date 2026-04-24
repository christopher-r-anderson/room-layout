import { expect, test, type Page } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
} from './support/editor-harness'

function expectUniqueItemIds(itemIds: string[]) {
  expect(new Set(itemIds).size).toBe(itemIds.length)
}

async function expectNoSafePlacementError(page: Page) {
  await expect(
    page.getByText(
      'No safe placement slot is available for that furniture item.',
    ),
  ).toBeHidden()
}

test('keeps successful adds free of false no-space errors and duplicate ids', async ({
  page,
}) => {
  await openEditor(page)

  const firstAddState = await addFurniture(page, 'Leather Couch')
  expect(firstAddState.itemCount).toBe(1)

  await dragSelectedFurniture(page, {
    x: 1200,
    y: 0,
  })

  const secondAddState = await addFurniture(page, 'Leather Couch')
  expect(secondAddState.itemCount).toBe(2)
  expectUniqueItemIds(secondAddState.items.map((item) => item.id))
  await expectNoSafePlacementError(page)

  const thirdAddState = await addFurniture(page, 'Leather Armchair')
  expect(thirdAddState.itemCount).toBe(3)
  expectUniqueItemIds(thirdAddState.items.map((item) => item.id))
  await expectNoSafePlacementError(page)

  expect(thirdAddState.selectedName).toBe('Leather Armchair')
})
