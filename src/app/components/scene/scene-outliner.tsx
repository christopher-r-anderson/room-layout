import { useEffect, useId, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import type { SceneReadModel } from '@/scene/scene.types'

export interface SceneOutlinerFocusRequest {
  token: number
  preferredIndex?: number
  targetSelectedId?: string | null
  focusContainer?: boolean
}

export function SceneOutliner({
  readModel,
  disabled,
  focusRequest,
  onFocusHandled,
  onSelectById,
}: {
  readModel: SceneReadModel
  disabled: boolean
  focusRequest: SceneOutlinerFocusRequest | null
  onFocusHandled: () => void
  onSelectById: (id: string | null) => void
}) {
  const headingId = useId()
  const containerRef = useRef<HTMLElement | null>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (!focusRequest || disabled) {
      return
    }

    if (focusRequest.focusContainer) {
      containerRef.current?.focus()
      onFocusHandled()
      return
    }

    if (focusRequest.targetSelectedId) {
      const selectedButton = buttonRefs.current.get(
        focusRequest.targetSelectedId,
      )

      if (selectedButton) {
        selectedButton.focus()
        onFocusHandled()
        return
      }
    }

    if (readModel.items.length === 0) {
      containerRef.current?.focus()
      onFocusHandled()
      return
    }

    const nextIndex = Math.min(
      focusRequest.preferredIndex ?? 0,
      readModel.items.length - 1,
    )
    const nextItem = readModel.items[Math.max(nextIndex, 0)]

    buttonRefs.current.get(nextItem.id)?.focus()

    onFocusHandled()
  }, [disabled, focusRequest, onFocusHandled, readModel.items])

  return (
    <section
      ref={containerRef}
      aria-labelledby={headingId}
      className="pointer-events-auto"
      tabIndex={-1}
    >
      <Card
        size="sm"
        className="w-full max-w-sm bg-background/90 shadow-sm backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle id={headingId}>Furniture in room</CardTitle>
          <CardDescription>
            Use this list to select furniture without the canvas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {readModel.items.length === 0 ? (
            <p className="text-muted-foreground">No furniture in the room.</p>
          ) : (
            <ScrollArea className="max-h-40">
              <ul className="space-y-2" aria-label="Furniture items">
                {readModel.items.map((item) => {
                  const isSelected = item.id === readModel.selectedId

                  return (
                    <li key={item.id}>
                      <button
                        ref={(element) => {
                          if (element) {
                            buttonRefs.current.set(item.id, element)
                            return
                          }

                          buttonRefs.current.delete(item.id)
                        }}
                        type="button"
                        aria-current={isSelected ? 'true' : undefined}
                        disabled={disabled}
                        className={cn(
                          buttonVariants({
                            variant: isSelected ? 'secondary' : 'outline',
                            size: 'sm',
                          }),
                          'w-full justify-between text-left',
                        )}
                        onClick={() => {
                          onSelectById(item.id)
                        }}
                      >
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
