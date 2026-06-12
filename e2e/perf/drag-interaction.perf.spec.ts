import { stat, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  addFurniture,
  dragSelectedFurniture,
  openEditor,
  readPerfCounters,
  readSceneState,
  resetPerfCounters,
  selectOutlinerItemByKeyboard,
  withPerfTrace,
} from '../support/editor-harness'

const ITERATION_COUNT = 5

test('captures a baseline drag interaction trace', async ({
  page,
}, testInfo) => {
  await openEditor(page)
  const addedState = await addFurniture(page, 'Leather Couch')
  const selectedId = addedState.items[0]?.id ?? null

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(selectedId)

  await dragSelectedFurniture(page, { x: 80, y: 0 })

  const beforeTraceState = await readSceneState(page)
  const initialPosition =
    beforeTraceState.items.find((item) => item.id === selectedId)?.position ??
    null

  await resetPerfCounters(page)
  const { result: finalState, tracePath } = await withPerfTrace(
    page,
    'drag-interaction',
    async () => {
      let tracedFinalState = beforeTraceState
      for (let i = 0; i < ITERATION_COUNT; i += 1) {
        await dragSelectedFurniture(page, { x: 60, y: 40 })
        tracedFinalState = await readSceneState(page)
      }

      return tracedFinalState
    },
  )
  const counters = await readPerfCounters(page)
  const countersPath = tracePath.replace(/\.trace\.json$/, '.counters.json')

  await writeFile(
    countersPath,
    JSON.stringify(
      {
        iterations: ITERATION_COUNT,
        counters,
      },
      null,
      2,
    ),
    'utf8',
  )

  const finalPosition =
    finalState.items.find((item) => item.id === selectedId)?.position ?? null
  const traceStats = await stat(tracePath)

  expect(initialPosition).not.toBeNull()
  expect(finalPosition).not.toEqual(initialPosition)
  expect(traceStats.size).toBeGreaterThan(0)

  await testInfo.attach('drag-interaction-trace', {
    path: tracePath,
    contentType: 'application/json',
  })
  await testInfo.attach('drag-interaction-counters', {
    path: countersPath,
    contentType: 'application/json',
  })
})
