import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { MoveSelectionResult, MoveSource } from '@/scene/scene.types'

function formatCoordinate(value: number) {
  return `${value.toFixed(1)} m`
}

function formatRotation(rotationY: number) {
  return `${String(Math.round((rotationY * 180) / Math.PI))} deg`
}

export function SceneInspector({
  disabled,
  onMoveSelection,
  onOpenDeleteDialog,
  onRotateSelection,
  selectedFurniture,
}: {
  disabled: boolean
  onMoveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem | null
}) {
  const controlsDisabled = disabled || !selectedFurniture

  return (
    <section className="pointer-events-auto">
      <Card
        size="sm"
        className="w-full max-w-sm bg-background/90 shadow-sm backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle>Selected item</CardTitle>
          <CardDescription>
            Move, rotate, or remove the selected furniture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
              Select an item from the list or canvas to edit it.
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                onMoveSelection({ x: 0, z: -0.5 }, { source: 'inspector' })
              }}
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                onMoveSelection({ x: 0, z: 0.5 }, { source: 'inspector' })
              }}
            >
              Move down
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                onMoveSelection({ x: -0.5, z: 0 }, { source: 'inspector' })
              }}
            >
              Move left
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                onMoveSelection({ x: 0.5, z: 0 }, { source: 'inspector' })
              }}
            >
              Move right
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                onRotateSelection(1)
              }}
            >
              Rotate selected left
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                onRotateSelection(-1)
              }}
            >
              Rotate selected right
            </Button>
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={controlsDisabled}
            onClick={() => {
              onOpenDeleteDialog()
            }}
          >
            Remove selected item
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
