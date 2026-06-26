import { Toolbar } from '@base-ui/react/toolbar'
import { ButtonGroupText } from '@/shared/ui/button-group'
import { buttonGroupVariants } from '@/shared/ui/button-group-variants'
import {
  IconBoxAlignBottom,
  IconBoxAlignBottomRight,
  IconBoxAlignRight,
  IconBoxMargin,
  IconCamera,
  IconFocus2,
} from '@tabler/icons-react'
import { cn } from '@/shared/lib/utils'
import { ToolButton } from '@/shared/ui/tool-button'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'

export interface CameraToolsProps {
  editorInteractionsEnabled: boolean
  hasSelection: boolean
  displayLabels?: boolean
}

export function CameraTools({
  editorInteractionsEnabled,
  hasSelection,
  displayLabels = true,
}: CameraToolsProps) {
  const dispatch = useCommandDispatch()
  const presetsDisabled = !editorInteractionsEnabled
  const presetsDisabledMessage =
    'Editor interactions are unavailable while loading'
  const buttonClass = 'flex-row-reverse sm:justify-between'

  return (
    <Toolbar.Root
      orientation="vertical"
      aria-label="Camera"
      className={cn(buttonGroupVariants({ orientation: 'vertical' }))}
    >
      <ButtonGroupText className="justify-between p-1 px-2">
        <span className="hidden md:flex">Camera</span>
        <IconCamera aria-hidden="true" />
      </ButtonGroupText>
      <ToolButton
        action={() => {
          dispatch({ kind: 'set-camera-preset', preset: 'corner' })
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
          dispatch({ kind: 'set-camera-preset', preset: 'front' })
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
          dispatch({ kind: 'set-camera-preset', preset: 'side' })
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
          dispatch({ kind: 'set-camera-preset', preset: 'top' })
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
        action={() => {
          dispatch({ kind: 'focus-selected' })
        }}
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
    </Toolbar.Root>
  )
}
