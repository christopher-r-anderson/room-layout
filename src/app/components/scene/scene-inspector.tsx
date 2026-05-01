import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

function formatCoordinate(value: number) {
  return `${value.toFixed(1)} m`
}

function formatRotation(rotationY: number) {
  return `${String(Math.round((rotationY * 180) / Math.PI))} deg`
}

export function SceneInspector({
  selectedFurniture,
}: {
  selectedFurniture: FurnitureItem | null
}) {
  const title = selectedFurniture
    ? `${selectedFurniture.name} details`
    : 'Details'

  return (
    <section className="pointer-events-auto">
      <Card
        size="sm"
        className="w-full bg-background/90 shadow-sm backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-12 space-y-2">
          {selectedFurniture ? (
            <>
              <p className="text-muted-foreground">
                Rotation: {formatRotation(selectedFurniture.rotationY)}
              </p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>
                  X: {formatCoordinate(selectedFurniture.position[0])}
                </span>
                <span>
                  Z: {formatCoordinate(selectedFurniture.position[2])}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Select an item.</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
