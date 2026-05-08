import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import {
  IconBoxAlignBottom,
  IconBoxAlignBottomRight,
  IconBoxAlignRight,
  IconBoxMargin,
  IconCamera,
  IconFocus2,
} from '@tabler/icons-react'
import { ToolButton } from '@/components/ui/tool-button'
import type { CameraPreset } from '@/scene/scene.types'

export function CameraTools({
  editorInteractionsEnabled,
  hasSelection,
  onSetPreset,
  onFocusSelected,
}: {
  editorInteractionsEnabled: boolean
  hasSelection: boolean
  onSetPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
}) {
  const presetsDisabled = !editorInteractionsEnabled
  const presetsDisabledMessage =
    'Editor interactions are unavailable while loading'
  const buttonClass = 'flex-row-reverse sm:justify-between'

  return (
    <ButtonGroup orientation="vertical" aria-label="Camera">
      <ButtonGroupText className="justify-between p-1 px-2">
        <span className="hidden sm:flex">Camera</span>
        <IconCamera aria-hidden="true" />
      </ButtonGroupText>
      <ToolButton
        action={() => {
          onSetPreset('corner')
        }}
        disabled={presetsDisabled}
        disabledMessage={presetsDisabledMessage}
        shortcuts=""
        label="Switch to Corner view"
        visibleLabel="Corner"
        className={buttonClass}
        icon={<IconBoxAlignBottomRight />}
        tooltipSide="left"
      />
      <ToolButton
        action={() => {
          onSetPreset('front')
        }}
        disabled={presetsDisabled}
        disabledMessage={presetsDisabledMessage}
        shortcuts=""
        label="Switch to Front view"
        visibleLabel="Front"
        className={buttonClass}
        icon={<IconBoxAlignBottom />}
        tooltipSide="left"
      />
      <ToolButton
        action={() => {
          onSetPreset('side')
        }}
        disabled={presetsDisabled}
        disabledMessage={presetsDisabledMessage}
        shortcuts=""
        label="Switch to Side view"
        visibleLabel="Side"
        className={buttonClass}
        icon={<IconBoxAlignRight />}
        tooltipSide="left"
      />
      <ToolButton
        action={() => {
          onSetPreset('top')
        }}
        disabled={presetsDisabled}
        disabledMessage={presetsDisabledMessage}
        shortcuts=""
        label="Switch to Top view"
        visibleLabel="Top"
        className={buttonClass}
        icon={<IconBoxMargin />}
        tooltipSide="left"
      />
      <ToolButton
        action={onFocusSelected}
        disabled={!hasSelection || !editorInteractionsEnabled}
        disabledMessage={
          !editorInteractionsEnabled
            ? presetsDisabledMessage
            : 'No item selected'
        }
        shortcuts="F"
        label="Focus Selected"
        className={buttonClass}
        icon={<IconFocus2 />}
        tooltipSide="left"
      />
    </ButtonGroup>
  )
}
