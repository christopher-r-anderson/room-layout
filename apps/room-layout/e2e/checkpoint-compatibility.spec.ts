import { expect, test } from '@playwright/test'
import fixture from './fixtures/layout-v1.json' with { type: 'json' }
import {
  SCENE_DRAFT_STORAGE_KEY,
  waitForEditorReady,
} from './support/editor-harness'

// Fixtures pin the payload format; storage uses the e2e namespace.
for (const source of ['url', 'draft'] as const) {
  test(`restores the 0.1.0 ${source} fixture without changing its layout`, async ({
    page,
  }) => {
    if (source === 'draft') {
      await page.addInitScript(
        ({ key, draft }) => {
          localStorage.setItem(key, JSON.stringify(draft))
        },
        { key: SCENE_DRAFT_STORAGE_KEY, draft: fixture.draft },
      )
    }
    await page.goto(source === 'url' ? fixture.route : '/room-layout/')
    const state = await waitForEditorReady(page)
    expect(
      state.items.map(({ id, catalogId, position, rotationY }) => ({
        id,
        catalogId,
        position,
        rotationY,
      })),
    ).toEqual(fixture.draft.items)
    expect(state.roomSize).toEqual(fixture.draft.roomSize)
    expect(state.floorFinishId).toBe(fixture.draft.floorFinishId)
    expect(state.wallFinishId).toBe(fixture.draft.wallFinishId)
    expect(state.lightingMoodId).toBe(fixture.draft.lightingMoodId)
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as unknown,
          SCENE_DRAFT_STORAGE_KEY,
        ),
      )
      .toEqual(fixture.draft)
  })
}
