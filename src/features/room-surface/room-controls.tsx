import { IconLoader } from '@tabler/icons-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { cn } from '@/shared/lib/utils'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { useEnvironmentConfig } from '@/core/stores/assets-store'
import {
  sceneDocumentActions,
  useFloorFinishLoading,
} from '@/core/stores/scene-document-store'
import {
  FLOOR_FINISH_DESCRIPTION,
  LIGHTING_MOOD_DESCRIPTION,
  WALL_FINISH_DESCRIPTION,
} from './room-copy'

function formatHexColor(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function RoomControls() {
  const environmentConfig = useEnvironmentConfig()
  const floorFinishLoading = useFloorFinishLoading()
  const {
    activeFloorFinishId: floorFinishId,
    activeWallFinishId: wallFinishId,
    activeLightingMoodId: lightingMoodId,
  } = useActiveFinishIds()
  const floorFinishes = environmentConfig?.floorFinishes ?? []
  const wallFinishes = environmentConfig?.wallFinishes ?? []
  const lightingMoods = environmentConfig?.lightingMoods ?? []
  const onFloorFinishChange = sceneDocumentActions.setFloorFinishId
  const onWallFinishChange = sceneDocumentActions.setWallFinishId
  const onLightingMoodChange = sceneDocumentActions.setLightingMoodId

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
                      backgroundColor: formatHexColor(item.color),
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
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Lighting mood</p>
          <p className="text-xs text-muted-foreground">
            {LIGHTING_MOOD_DESCRIPTION}
          </p>
        </div>
        <fieldset className="grid gap-2 border-0 p-0 min-[22rem]:grid-cols-2">
          <legend className="sr-only">Lighting mood</legend>
          {lightingMoods.map((item) => {
            const isSelected = lightingMoodId === item.id

            return (
              <label key={item.id} className="block min-w-0 cursor-pointer">
                <input
                  className="peer sr-only"
                  aria-label={item.label}
                  type="radio"
                  name="lighting-mood"
                  value={item.id}
                  checked={isSelected}
                  onChange={(event) => {
                    onLightingMoodChange(event.target.value)
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
                      backgroundImage: `linear-gradient(135deg, ${formatHexColor(
                        item.keyLightColor,
                      )}, ${formatHexColor(item.environmentColor)})`,
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs/relaxed font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Lighting mood
                    </span>
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
      </TabsContent>
    </Tabs>
  )
}
