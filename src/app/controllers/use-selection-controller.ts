import { useCallback } from 'react'
import {
  sceneStateActions,
  useSelectedId,
} from '@/editor-state/scene-state-store'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { SelectByIdResult } from '@/scene/scene.types'
import type { InteractionSource } from '@/editor-state/types/interaction.types'
import { selectionEffects } from '@/editor-state/selection-effects'

interface SelectionControllerOptions {
  editorInteractionsEnabled: boolean
}

export function useSelectionController({
  editorInteractionsEnabled,
}: SelectionControllerOptions) {
  const selectedId = useSelectedId()

  const handleCanvasPointerSelection = useCallback(
    (id: string) => {
      if (!editorInteractionsEnabled) {
        return
      }

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
    },
    [editorInteractionsEnabled, selectedId],
  )

  const handleSelectById = useCallback(
    (id: string | null, source?: InteractionSource): SelectByIdResult => {
      if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
        return {
          ok: false,
          status: 'not-found',
        }
      }

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
    },
    [editorInteractionsEnabled, selectedId],
  )

  const handleClearSelection = useCallback(() => {
    if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
      return
    }

    sceneCommands.clearSelection()
    selectionEffects.notePendingSelection({
      announceMode: 'default',
      requestOutlinerFocus: false,
    })
    sceneStateActions.clearEditorMessage()
  }, [editorInteractionsEnabled])

  return {
    handleCanvasPointerSelection,
    handleSelectById,
    handleClearSelection,
  }
}
