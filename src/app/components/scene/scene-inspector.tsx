import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  return (
    <section className="pointer-events-auto">
      <Card
        size="sm"
        className="w-full max-w-sm bg-background/90 shadow-sm backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle>Selected item</CardTitle>
          <CardDescription>View selection details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedFurniture ? (
            <>
              <div>
                <p className="font-medium text-foreground">
                  {selectedFurniture.name}
                </p>
                <p className="text-muted-foreground">
                  Rotation: {formatRotation(selectedFurniture.rotationY)}
                </p>
              </div>
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
            <p className="text-muted-foreground">
              Select an item from the list or canvas to inspect it.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
