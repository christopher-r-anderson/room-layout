import { sceneStateActions } from '@/core/stores/scene-state-store'

const SCENE_PREVIEW_CLEAR_DELAY_MS = 50

type PreviewSource =
  | 'scene'
  | 'outliner-hover'
  | 'outliner-focus'
  | 'canvas-keyboard'
type OutlinerPreviewSource = 'outliner-hover' | 'outliner-focus'

// Imperative preview scratch lives at module scope rather than in store state:
// the hysteresis timer and the active preview source are scheduling details, not
// reactive values. Consumers drive these through the exported actions; the raw
// previewed id is held in scene-state-store and gated for reads by usePreviewedId.
let scenePreviewClearTimeout: number | null = null
let previewSource: PreviewSource | null = null

function setPreview(id: string) {
  sceneStateActions.setPreviewedId(id)
}

function clearPreview() {
  sceneStateActions.setPreviewedId(null)
}

export function cancelScenePreviewClear() {
  if (scenePreviewClearTimeout === null) {
    return
  }

  window.clearTimeout(scenePreviewClearTimeout)
  scenePreviewClearTimeout = null
}

function scheduleScenePreviewClear() {
  cancelScenePreviewClear()

  scenePreviewClearTimeout = window.setTimeout(() => {
    const isSceneSource = previewSource === 'scene'
    scenePreviewClearTimeout = null

    if (!isSceneSource) {
      return
    }

    previewSource = null
    clearPreview()
  }, SCENE_PREVIEW_CLEAR_DELAY_MS)
}

function resetAndClearPreview() {
  cancelScenePreviewClear()
  previewSource = null
  clearPreview()
}

export function previewFromScene(id: string | null) {
  if (id !== null) {
    cancelScenePreviewClear()
    previewSource = 'scene'
    setPreview(id)
    return
  }

  scheduleScenePreviewClear()
}

export function previewFromOutliner(
  id: string | null,
  source: OutlinerPreviewSource,
) {
  cancelScenePreviewClear()

  if (id !== null) {
    previewSource = source
    setPreview(id)
    return
  }

  if (previewSource !== source) {
    return
  }

  previewSource = null
  clearPreview()
}

export function previewFromCanvasKeyboard(id: string | null) {
  cancelScenePreviewClear()

  if (id !== null) {
    previewSource = 'canvas-keyboard'
    setPreview(id)
    return
  }

  if (previewSource !== 'canvas-keyboard') {
    return
  }

  previewSource = null
  clearPreview()
}

// Background clicks should clear preview immediately rather than waiting for the
// scene-leave hysteresis used to smooth pointer churn.
export function clearPreviewOnCanvasMiss() {
  resetAndClearPreview()
}

// Drives the state-hygiene reset when preview must not persist (dragging, a
// blocking overlay is open, or interactions are disabled).
export function forceClearPreview() {
  resetAndClearPreview()
}

export function resetPreviewState() {
  cancelScenePreviewClear()
  previewSource = null
}
