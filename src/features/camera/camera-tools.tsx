import { useEditorInteractionsEnabled } from '@/editor-state/editor-runtime-store'
import { useHasSelection } from '@/editor-state/scene-state-store'
import { CameraTools, type CameraToolsProps } from './camera-tools-view'

export { CameraTools, type CameraToolsProps } from './camera-tools-view'

export function ConnectedCameraTools({
  onSetPreset,
  onFocusSelected,
}: Omit<CameraToolsProps, 'editorInteractionsEnabled' | 'hasSelection'>) {
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const hasSelection = useHasSelection()

  return (
    <CameraTools
      editorInteractionsEnabled={editorInteractionsEnabled}
      hasSelection={hasSelection}
      onSetPreset={onSetPreset}
      onFocusSelected={onFocusSelected}
    />
  )
}
