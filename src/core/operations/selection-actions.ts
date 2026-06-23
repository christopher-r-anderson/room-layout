import {
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import type { SelectByIdResult } from '@/scene/scene.types'
import type { InteractionSource } from '@/core/types/interaction.types'

export function selectByCanvasPointer(id: string) {
  const editorInteractionsEnabled =
    isEditorInteractive()

  if (!editorInteractionsEnabled) {
    return
  }

  const selectedId = sceneDocumentStore.getState().selectedId

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
  selectionFocusActions.setSelectedSource('canvas-pointer')
}

export function selectById(
  id: string | null,
  source?: InteractionSource,
): SelectByIdResult {
  const editorInteractionsEnabled =
    isEditorInteractive()

  if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
    return {
      ok: false,
      status: 'not-found',
    }
  }

  const selectedId = sceneDocumentStore.getState().selectedId
  const selectionWillChange = selectedId !== id
  const result = sceneCommands.selectById(id)
  sceneDocumentActions.clearEditorMessage()

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
      selectionFocusActions.setSelectedSource(source)
    } else {
      selectionEffects.notePendingSource(null)
      if (result.ok) {
        selectionFocusActions.setSelectedSource(source)
      }
    }
  }

  return result
}

export function clearSelection() {
  const editorInteractionsEnabled =
    isEditorInteractive()

  if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.clearSelection()
  selectionEffects.notePendingSelection({
    announceMode: 'default',
    requestOutlinerFocus: false,
  })
  sceneDocumentActions.clearEditorMessage()
}
