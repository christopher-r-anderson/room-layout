import { Toolbar } from '@base-ui/react/toolbar'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  IconBoxAlignBottom,
  IconBoxAlignBottomRight,
  IconBoxAlignRight,
  IconBoxMargin,
  IconCamera,
  IconFocus2,
} from '@tabler/icons-react'
import { cn } from '@/shared/lib/utils'
import { Caption } from '@/shared/ui/caption'
import { Surface } from '@/shared/ui/surface'
import { ToolButton } from '@/shared/ui/tool-button'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'

export interface CameraToolsProps {
  hasSelection: boolean
  displayLabels?: boolean
}

export function CameraTools({
  hasSelection,
  displayLabels = true,
}: CameraToolsProps) {
  const { t } = useLingui()
  const dispatch = useCommandDispatch()
  // Buttons reverse so their icons hug the physical right edge this cluster pins to
  // (for right-thumb reach), keeping icons in place as labels collapse. Physical by
  // intent: the cluster does not mirror for RTL.
  const buttonClass = 'flex-row-reverse sm:justify-between'

  return (
    <Surface padding="snug" className="flex flex-col gap-1.5">
      <Caption className={cn('flex items-center gap-1 px-2', buttonClass)}>
        <IconCamera className="size-3.5" aria-hidden="true" />
        {displayLabels ? (
          <span>
            <Trans>Camera</Trans>
          </span>
        ) : null}
      </Caption>
      <Toolbar.Root
        orientation="vertical"
        aria-label={t`Camera`}
        className="flex flex-col gap-1"
      >
        <ToolButton
          action={() => {
            dispatch({ kind: 'set-camera-preset', preset: 'corner' })
          }}
          shortcuts="1"
          label={t`Switch to Corner view`}
          visibleLabel={t`Corner`}
          displayLabel={displayLabels}
          className={buttonClass}
          icon={<IconBoxAlignBottomRight />}
          tooltipSide="left"
        />
        <ToolButton
          action={() => {
            dispatch({ kind: 'set-camera-preset', preset: 'front' })
          }}
          shortcuts="2"
          label={t`Switch to Front view`}
          visibleLabel={t`Front`}
          displayLabel={displayLabels}
          className={buttonClass}
          icon={<IconBoxAlignBottom />}
          tooltipSide="left"
        />
        <ToolButton
          action={() => {
            dispatch({ kind: 'set-camera-preset', preset: 'side' })
          }}
          shortcuts="3"
          label={t`Switch to Side view`}
          visibleLabel={t`Side`}
          displayLabel={displayLabels}
          className={buttonClass}
          icon={<IconBoxAlignRight />}
          tooltipSide="left"
        />
        <ToolButton
          action={() => {
            dispatch({ kind: 'set-camera-preset', preset: 'top' })
          }}
          shortcuts="4"
          label={t`Switch to Top view`}
          visibleLabel={t`Top`}
          displayLabel={displayLabels}
          className={buttonClass}
          icon={<IconBoxMargin />}
          tooltipSide="left"
        />
        <ToolButton
          action={() => {
            dispatch({ kind: 'focus-selected' })
          }}
          disabled={!hasSelection}
          disabledMessage={t`No item selected`}
          shortcuts="F"
          label={t`Focus Selected`}
          displayLabel={displayLabels}
          className={buttonClass}
          icon={<IconFocus2 />}
          tooltipSide="left"
        />
      </Toolbar.Root>
    </Surface>
  )
}
