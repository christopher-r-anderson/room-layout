import { ButtonGroup, ButtonGroupText } from '@/shared/ui/button-group'
import {
  IconBoxAlignBottom,
  IconBoxAlignBottomRight,
  IconBoxAlignRight,
  IconBoxMargin,
  IconCamera,
  IconFocus2,
} from '@tabler/icons-react'
import { ToolButton } from '@/shared/ui/tool-button'
import type { CameraPreset } from '@/shared/lib/three/camera-presets'

export interface CameraToolsProps {
  editorInteractionsEnabled: boolean
  hasSelection: boolean
  onSetPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
  displayLabels?: boolean
}

export function CameraTools({
  editorInteractionsEnabled,
  hasSelection,
  onSetPreset,
  onFocusSelected,
  displayLabels = true,
}: CameraToolsProps) {
  const presetsDisabled = !editorInteractionsEnabled
  const presetsDisabledMessage =
    'Editor interactions are unavailable while loading'
  const buttonClass = 'flex-row-reverse sm:justify-between'

  return (
    <ButtonGroup orientation="vertical" aria-label="Camera">
      <ButtonGroupText className="justify-between p-1 px-2">
        <span className="hidden md:flex">Camera</span>
        <IconCamera aria-hidden="true" />
      </ButtonGroupText>
      <ToolButton
        action={() => {
          onSetPreset('corner')
        }}
        disabled={presetsDisabled}
        disabledMessage={presetsDisabledMessage}
        shortcuts="1"
        label="Switch to Corner view"
        visibleLabel="Corner"
        displayLabel={displayLabels}
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
        shortcuts="2"
        label="Switch to Front view"
        visibleLabel="Front"
        displayLabel={displayLabels}
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
        shortcuts="3"
        label="Switch to Side view"
        visibleLabel="Side"
        displayLabel={displayLabels}
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
        shortcuts="4"
        label="Switch to Top view"
        visibleLabel="Top"
        displayLabel={displayLabels}
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
        displayLabel={displayLabels}
        className={buttonClass}
        icon={<IconFocus2 />}
        tooltipSide="left"
      />
    </ButtonGroup>
  )
}
