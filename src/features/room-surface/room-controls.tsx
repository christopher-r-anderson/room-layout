import { type CSSProperties } from 'react'
import { IconLoader } from '@tabler/icons-react'
import type {
  FloorFinishOption,
  LightingMoodOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
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
import { FinishPicker } from './finish-picker'

function formatHexColor(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`
}

function swatchCardRenderer<T extends { id: string; label: string }>(
  sublabel: string,
  swatchStyle: (item: T) => CSSProperties,
) {
  return (item: T) => (
    <>
      <span
        className="size-10 shrink-0 rounded-full border border-black/10 shadow-sm"
        style={swatchStyle(item)}
      />
      <span className="min-w-0">
        <span className="block truncate text-xs/relaxed font-medium text-foreground">
          {item.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {sublabel}
        </span>
      </span>
    </>
  )
}

const renderWallCard = swatchCardRenderer<WallFinishOption>(
  'Paint finish',
  (item) => ({ backgroundColor: formatHexColor(item.color) }),
)

const renderLightingCard = swatchCardRenderer<LightingMoodOption>(
  'Lighting mood',
  (item) => ({
    backgroundImage: `linear-gradient(135deg, ${formatHexColor(
      item.keyLightColor,
    )}, ${formatHexColor(item.environmentColor)})`,
  }),
)

export function RoomControls() {
  const environmentConfig = useEnvironmentConfig()
  const floorFinishLoading = useFloorFinishLoading()
  const {
    activeFloorFinishId: floorFinishId,
    activeWallFinishId: wallFinishId,
    activeLightingMoodId: lightingMoodId,
  } = useActiveFinishIds()

  const renderFloorCard = (item: FloorFinishOption, isSelected: boolean) => (
    <>
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
    </>
  )

  return (
    <Tabs defaultValue="walls" className="gap-3">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="walls">Walls</TabsTrigger>
        <TabsTrigger value="floor">Floor</TabsTrigger>
        <TabsTrigger value="lighting">Lighting</TabsTrigger>
      </TabsList>

      <TabsContent value="walls" className="space-y-3">
        <FinishPicker
          label="Wall finish"
          description={WALL_FINISH_DESCRIPTION}
          name="wall-finish"
          options={environmentConfig?.wallFinishes ?? []}
          selectedId={wallFinishId}
          onChange={sceneDocumentActions.setWallFinishId}
          cardClassName="flex items-center gap-3 p-3"
          renderCard={renderWallCard}
        />
      </TabsContent>

      <TabsContent
        value="floor"
        className="space-y-3"
        aria-busy={floorFinishLoading}
      >
        <FinishPicker
          label="Floor finish"
          description={FLOOR_FINISH_DESCRIPTION}
          name="floor-finish"
          options={environmentConfig?.floorFinishes ?? []}
          selectedId={floorFinishId}
          onChange={sceneDocumentActions.setFloorFinishId}
          cardClassName="grid gap-2 p-2"
          renderCard={renderFloorCard}
          headerAccessory={
            floorFinishLoading ? (
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
            ) : null
          }
        />
      </TabsContent>

      <TabsContent value="lighting" className="space-y-3">
        <FinishPicker
          label="Lighting mood"
          description={LIGHTING_MOOD_DESCRIPTION}
          name="lighting-mood"
          options={environmentConfig?.lightingMoods ?? []}
          selectedId={lightingMoodId}
          onChange={sceneDocumentActions.setLightingMoodId}
          cardClassName="flex items-center gap-3 p-3"
          renderCard={renderLightingCard}
        />
      </TabsContent>
    </Tabs>
  )
}
