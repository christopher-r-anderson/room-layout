import { IconLoader, IconSparkles } from '@tabler/icons-react'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { cn } from '@/shared/lib/utils'
import { FLOOR_FINISH_DESCRIPTION, WALL_FINISH_DESCRIPTION } from './room-copy'

export interface RoomControlsProps {
  floorFinishId: string
  floorFinishLoading: boolean
  floorFinishes: FloorFinishOption[]
  onFloorFinishChange: (finishId: string) => void
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
}

function formatWallFinishColor(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function RoomControls({
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  onFloorFinishChange,
  wallFinishId,
  wallFinishes,
  onWallFinishChange,
}: RoomControlsProps) {
  return (
    <Tabs defaultValue="walls" className="gap-3">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="walls">Walls</TabsTrigger>
        <TabsTrigger value="floor">Floor</TabsTrigger>
        <TabsTrigger value="lighting">Lighting</TabsTrigger>
      </TabsList>

      <TabsContent value="walls" className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Wall finish</p>
          <p className="text-xs text-muted-foreground">
            {WALL_FINISH_DESCRIPTION}
          </p>
        </div>
        <fieldset className="grid gap-2 border-0 p-0 min-[22rem]:grid-cols-2">
          <legend className="sr-only">Wall finish</legend>
          {wallFinishes.map((item) => {
            const isSelected = wallFinishId === item.id

            return (
              <label key={item.id} className="block min-w-0 cursor-pointer">
                <input
                  className="peer sr-only"
                  aria-label={item.label}
                  type="radio"
                  name="wall-finish"
                  value={item.id}
                  checked={isSelected}
                  onChange={(event) => {
                    onWallFinishChange(event.target.value)
                  }}
                />
                <span
                  className={cn(
                    'flex h-full items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50',
                    isSelected
                      ? 'border-primary/60 bg-primary/5'
                      : 'hover:border-foreground/20 hover:shadow-sm',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className="size-10 shrink-0 rounded-full border border-black/10 shadow-sm"
                    style={{
                      backgroundColor: formatWallFinishColor(item.color),
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs/relaxed font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Paint finish
                    </span>
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
      </TabsContent>

      <TabsContent
        value="floor"
        className="space-y-3"
        aria-busy={floorFinishLoading}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Floor finish</p>
            <p className="text-xs text-muted-foreground">
              {FLOOR_FINISH_DESCRIPTION}
            </p>
          </div>
          {floorFinishLoading ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              role="status"
            >
              <IconLoader
                size={12}
                className="animate-spin"
                aria-hidden="true"
              />
              Updating
            </span>
          ) : null}
        </div>
        <fieldset className="grid gap-2 border-0 p-0 min-[22rem]:grid-cols-2">
          <legend className="sr-only">Floor finish</legend>
          {floorFinishes.map((item) => {
            const isSelected = floorFinishId === item.id

            return (
              <label key={item.id} className="block min-w-0 cursor-pointer">
                <input
                  className="peer sr-only"
                  aria-label={item.label}
                  type="radio"
                  name="floor-finish"
                  value={item.id}
                  checked={isSelected}
                  onChange={(event) => {
                    onFloorFinishChange(event.target.value)
                  }}
                />
                <span
                  className={cn(
                    'grid h-full gap-2 rounded-lg border bg-card p-2 transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50',
                    isSelected
                      ? 'border-primary/60 bg-primary/5'
                      : 'hover:border-foreground/20 hover:shadow-sm',
                  )}
                  aria-hidden="true"
                >
                  <span className="block aspect-4/3 overflow-hidden rounded-md bg-muted">
                    {item.previewPath ? (
                      <img
                        className="block size-full object-cover"
                        src={item.previewPath}
                        alt=""
                      />
                    ) : (
                      <span className="block size-full bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(148,163,184,0.25))]" />
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs/relaxed font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        Material preview
                      </span>
                    </span>
                    {isSelected && floorFinishLoading ? (
                      <IconLoader
                        size={14}
                        className="shrink-0 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
      </TabsContent>

      <TabsContent value="lighting" className="space-y-3">
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-background p-2 text-muted-foreground">
              <IconSparkles size={16} aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Lighting</p>
              <p className="text-xs text-muted-foreground">
                Lighting presets are reserved for a later phase. This tab stays
                in place so the Room surface can grow without moving controls.
              </p>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
