import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
} from '@tabler/icons-react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { MoveSelectionResult, MoveSource } from '@/scene/scene.types'
import { ToolButton } from '@/components/ui/tool-button'

export function SelectionToolsMovement({
  editorInteractionsEnabled,
  onMoveSelection,
  selectedFurniture,
}: {
  editorInteractionsEnabled: boolean
  onMoveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  selectedFurniture: FurnitureItem | null
}) {
  const controlsDisabled = !editorInteractionsEnabled || !selectedFurniture

  return (
    <ButtonGroup aria-label="Selection Movement Actions">
      <ButtonGroupText className="hidden sm:flex">Move</ButtonGroupText>
      <ToolButton
        action={() => {
          onMoveSelection({ x: 0, z: -0.5 }, { source: 'toolbar' })
        }}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="ArrowUp Shift+ArrowUp Alt+ArrowUp"
        label="Move Up"
        visibleLabel="Up"
        shortcutHint="Keyboard: Shift moves farther. Alt moves finely."
        icon={<IconArrowUp />}
      />
      <ToolButton
        action={() => {
          onMoveSelection({ x: 0, z: 0.5 }, { source: 'toolbar' })
        }}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="ArrowDown Shift+ArrowDown Alt+ArrowDown"
        label="Move Down"
        visibleLabel="Down"
        shortcutHint="Keyboard: Shift moves farther. Alt moves finely."
        icon={<IconArrowDown />}
      />
      <ToolButton
        action={() => {
          onMoveSelection({ x: -0.5, z: 0 }, { source: 'toolbar' })
        }}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="ArrowLeft Shift+ArrowLeft Alt+ArrowLeft"
        label="Move Left"
        visibleLabel="Left"
        shortcutHint="Keyboard: Shift moves farther. Alt moves finely."
        icon={<IconArrowLeft />}
      />
      <ToolButton
        action={() => {
          onMoveSelection({ x: 0.5, z: 0 }, { source: 'toolbar' })
        }}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="ArrowRight Shift+ArrowRight Alt+ArrowRight"
        label="Move Right"
        visibleLabel="Right"
        shortcutHint="Keyboard: Shift moves farther. Alt moves finely."
        icon={<IconArrowRight />}
      />
    </ButtonGroup>
  )
}
