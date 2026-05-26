import { useEffect, useId, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  IconChevronDown,
  IconChevronRight,
  IconLoader,
} from '@tabler/icons-react'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { loadBooleanPreference, saveBooleanPreference } from '@/lib/ui/storage'

const ENVIRONMENT_PANEL_EXPANDED_PREFERENCE_KEY = 'environment-panel-expanded'

function loadStoredExpandedState() {
  return loadBooleanPreference(ENVIRONMENT_PANEL_EXPANDED_PREFERENCE_KEY, true)
}

export interface EnvironmentControlsProps {
  floorFinishId: string
  floorFinishLoading: boolean
  floorFinishes: FloorFinishOption[]
  onFloorFinishChange: (finishId: string) => void
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
}

type EnvironmentPanelProps = EnvironmentControlsProps

export function EnvironmentControls({
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  onFloorFinishChange,
  wallFinishId,
  wallFinishes,
  onWallFinishChange,
}: EnvironmentControlsProps) {
  const wallFinishLabel =
    wallFinishes.find((option) => option.id === wallFinishId)?.label ??
    wallFinishId
  const floorFinishLabel =
    floorFinishes.find((option) => option.id === floorFinishId)?.label ??
    floorFinishId

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          id="wall-finish-label"
          htmlFor="wall-finish-trigger"
          className="text-xs text-muted-foreground"
        >
          Wall Finish
        </label>
        <Select
          value={wallFinishId}
          onValueChange={(value) => {
            if (value === null) {
              return
            }
            onWallFinishChange(value)
          }}
        >
          <SelectTrigger
            id="wall-finish-trigger"
            aria-labelledby="wall-finish-label wall-finish-trigger"
            className="w-full"
          >
            <SelectValue>{wallFinishLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {wallFinishes.map((item) => (
                <SelectItem key={item.id} value={item.id} label={item.label}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label
          id="floor-finish-label"
          htmlFor="floor-finish-trigger"
          className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
        >
          <span>Floor Finish</span>
          {floorFinishLoading ? (
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              <IconLoader
                size={12}
                className="animate-spin"
                aria-hidden="true"
              />
            </span>
          ) : null}
        </label>
        <Select
          value={floorFinishId}
          onValueChange={(value) => {
            if (value === null) {
              return
            }
            onFloorFinishChange(value)
          }}
        >
          <SelectTrigger
            id="floor-finish-trigger"
            aria-labelledby="floor-finish-label floor-finish-trigger"
            aria-busy={floorFinishLoading}
            className="w-full"
          >
            <SelectValue>{floorFinishLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {floorFinishes.map((item) => (
                <SelectItem key={item.id} value={item.id} label={item.label}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function EnvironmentPanel({
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  onFloorFinishChange,
  wallFinishId,
  wallFinishes,
  onWallFinishChange,
}: EnvironmentPanelProps) {
  const headingId = useId()
  const contentId = useId()
  const [isExpanded, setIsExpanded] = useState(loadStoredExpandedState)

  useEffect(() => {
    saveBooleanPreference(ENVIRONMENT_PANEL_EXPANDED_PREFERENCE_KEY, isExpanded)
  }, [isExpanded])

  return (
    <Card
      size="sm"
      className="w-full bg-background/90 shadow-sm backdrop-blur-sm pointer-events-auto"
    >
      <Collapsible
        open={isExpanded}
        onOpenChange={setIsExpanded}
        className="w-full"
      >
        <CardHeader>
          <CardTitle id={headingId}>Environment</CardTitle>
          <CardAction>
            <CollapsibleTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-controls={contentId}
                  aria-label="Toggle environment panel"
                />
              }
            >
              {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
            </CollapsibleTrigger>
          </CardAction>
        </CardHeader>

        <CollapsibleContent render={<CardContent id={contentId} />}>
          <EnvironmentControls
            floorFinishId={floorFinishId}
            floorFinishLoading={floorFinishLoading}
            floorFinishes={floorFinishes}
            onFloorFinishChange={onFloorFinishChange}
            wallFinishId={wallFinishId}
            wallFinishes={wallFinishes}
            onWallFinishChange={onWallFinishChange}
          />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
