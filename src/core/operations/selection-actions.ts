import {
  sceneStateActions,
  sceneStateStore,
} from '@/core/stores/scene-state-store'
import { editorRuntimeStore } from '@/core/stores/editor-runtime-store'
import { selectionMetaActions } from '@/core/stores/selection-meta-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import type { SelectByIdResult } from '@/scene/scene.types'
import type { InteractionSource } from '@/core/types/interaction.types'

export function selectByCanvasPointer(id: string) {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'

  if (!editorInteractionsEnabled) {
    return
  }

  const selectedId = sceneStateStore.getState().selectedId

  selectionEffects.notePendingSelection(
    selectedId === id
      ? null
      : {
          announceMode: 'default',
          requestOutlinerFocus: false,
        },
  )
  selectionEffects.notePendingSource(
    selectedId === id ? null : 'canvas-pointer',
  )
  selectionMetaActions.setSelectedSource('canvas-pointer')
}

export function selectById(
  id: string | null,
  source?: InteractionSource,
): SelectByIdResult {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'

  if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
    return {
      ok: false,
      status: 'not-found',
    }
  }

  const selectedId = sceneStateStore.getState().selectedId
  const selectionWillChange = selectedId !== id
  const result = sceneCommands.selectById(id)
  sceneStateActions.clearEditorMessage()

  if (result.ok && selectionWillChange) {
    selectionEffects.notePendingSelection({
      announceMode:
        source === 'panel-keyboard'
          ? 'panel-keyboard'
          : source === 'canvas-keyboard'
            ? 'canvas-keyboard'
            : 'default',
      requestOutlinerFocus: false,
    })
  } else {
    selectionEffects.notePendingSelection(null)
  }

  if (source) {
    if (result.ok && selectionWillChange) {
      selectionEffects.notePendingSource(source)
      selectionMetaActions.setSelectedSource(source)
    } else {
      selectionEffects.notePendingSource(null)
      if (result.ok) {
        selectionMetaActions.setSelectedSource(source)
      }
    }
  }

  return result
}

export function clearSelection() {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'

  if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.clearSelection()
  selectionEffects.notePendingSelection({
    announceMode: 'default',
    requestOutlinerFocus: false,
  })
  sceneStateActions.clearEditorMessage()
}
