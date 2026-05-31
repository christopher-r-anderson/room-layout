import { stat, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  addFurniture,
  focusRoomView,
  holdKeyUntilCameraMoves,
  openEditor,
  readPerfCounters,
  readSceneState,
  resetPerfCounters,
  selectOutlinerItemByKeyboard,
  startCdpPerfTrace,
} from '../support/editor-harness'

function diffCounters(
  previous: {
    toolbarEmissions: number
    toolbarSinkWrites: number
    toolbarSinkNoOps: number
  },
  next: {
    toolbarEmissions: number
    toolbarSinkWrites: number
    toolbarSinkNoOps: number
  },
) {
  return {
    toolbarEmissions: next.toolbarEmissions - previous.toolbarEmissions,
    toolbarSinkWrites: next.toolbarSinkWrites - previous.toolbarSinkWrites,
    toolbarSinkNoOps: next.toolbarSinkNoOps - previous.toolbarSinkNoOps,
  }
}

test('captures a baseline selected camera nudge settle trace', async ({
  page,
}, testInfo) => {
  await openEditor(page)
  const addedState = await addFurniture(page, 'Leather Couch')
  const selectedId = addedState.items[0]?.id ?? null

  await selectOutlinerItemByKeyboard(page, /^Leather Couch/i)
  await expect
    .poll(async () => (await readSceneState(page)).selectedId)
    .toBe(selectedId)

  const toolbar = page.locator('section[aria-label="Selected item actions"]')
  await expect(toolbar).toHaveAttribute(
    'data-selected-toolbar-mode',
    'floating',
  )

  await focusRoomView(page)

  const warmupBaseline = (await readSceneState(page)).cameraPosition
  await holdKeyUntilCameraMoves(page, 'KeyW', warmupBaseline, 0.2)
  await page.waitForTimeout(500)

  await resetPerfCounters(page)
  const trace = await startCdpPerfTrace(page, 'selected-camera-nudge-settle')
  const before = await readPerfCounters(page)

  const nudgeBaseline = (await readSceneState(page)).cameraPosition
  await holdKeyUntilCameraMoves(page, 'KeyW', nudgeBaseline, 0.2)
  const afterNudge = await readPerfCounters(page)

  const settleDeadline = Date.now() + 750
  let settledState = await readSceneState(page)
  while (Date.now() < settleDeadline) {
    settledState = await readSceneState(page)
    expect(settledState.selectedId).toBe(selectedId)
    await expect(toolbar).toHaveAttribute(
      'data-selected-toolbar-mode',
      'floating',
    )
    await page.waitForTimeout(75)
  }

  const afterSettle = await readPerfCounters(page)
  const tracePath = await trace.stop()
  const countersPath = tracePath.replace(/\.trace\.json$/, '.counters.json')

  await writeFile(
    countersPath,
    JSON.stringify(
      {
        before,
        afterNudge,
        afterSettle,
        deltas: {
          nudgeOnly: diffCounters(before, afterNudge),
          settleOnly: diffCounters(afterNudge, afterSettle),
        },
      },
      null,
      2,
    ),
    'utf8',
  )

  const traceStats = await stat(tracePath)
  const nudgeOnly = diffCounters(before, afterNudge)
  const settleOnly = diffCounters(afterNudge, afterSettle)

  expect(settledState.selectedId).toBe(selectedId)
  expect(traceStats.size).toBeGreaterThan(0)
  expect(nudgeOnly.toolbarEmissions).toBeGreaterThanOrEqual(0)
  expect(nudgeOnly.toolbarSinkWrites).toBeGreaterThanOrEqual(0)
  expect(nudgeOnly.toolbarSinkNoOps).toBeGreaterThanOrEqual(0)
  expect(settleOnly.toolbarEmissions).toBeGreaterThanOrEqual(0)
  expect(settleOnly.toolbarSinkWrites).toBeGreaterThanOrEqual(0)
  expect(settleOnly.toolbarSinkNoOps).toBeGreaterThanOrEqual(0)

  await testInfo.attach('selected-camera-nudge-trace', {
    path: tracePath,
    contentType: 'application/json',
  })
  await testInfo.attach('selected-camera-nudge-counters', {
    path: countersPath,
    contentType: 'application/json',
  })
})
