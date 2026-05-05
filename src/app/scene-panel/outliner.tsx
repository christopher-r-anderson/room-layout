import { useEffect, useId, useRef, useState } from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import type { SceneReadModel } from '@/scene/scene.types'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { loadBooleanPreference, saveBooleanPreference } from '@/lib/ui/storage'
import type { SceneOutlinerFocusRequest } from '../scene-panel.types'

const OUTLINER_EXPANDED_PREFERENCE_KEY = 'outliner-expanded'

function loadStoredExpandedState() {
  return loadBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, true)
}

export function Outliner({
  readModel,
  disabled,
  focusRequest,
  onFocusHandled,
  onSelectById,
  onPreviewChange,
}: {
  readModel: SceneReadModel
  disabled: boolean
  focusRequest: SceneOutlinerFocusRequest | null
  onFocusHandled: () => void
  onSelectById: (id: string | null) => void
  onPreviewChange: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
}) {
  const headingId = useId()
  const contentId = useId()
  const containerRef = useRef<HTMLElement | null>(null)
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [isExpanded, setIsExpanded] = useState(loadStoredExpandedState)

  useEffect(() => {
    saveBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, isExpanded)
  }, [isExpanded])

  useEffect(() => {
    if (!focusRequest || disabled) {
      return
    }

    if (!isExpanded) {
      // Keep focus on a visible control when collapsed instead of targeting hidden content.
      toggleButtonRef.current?.focus()
      onFocusHandled()
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
  }, [disabled, focusRequest, isExpanded, onFocusHandled, readModel.items])

  return (
    <section
      ref={containerRef}
      aria-labelledby={headingId}
      className="pointer-events-auto"
      tabIndex={-1}
    >
      <Card
        size="sm"
        className="w-full bg-background/90 shadow-sm backdrop-blur-sm"
      >
        <Collapsible
          open={isExpanded}
          onOpenChange={setIsExpanded}
          className="w-full"
        >
          <CardHeader>
            <CardTitle id={headingId}>Furniture List</CardTitle>
            <CardAction>
              <CollapsibleTrigger
                render={
                  <Button
                    ref={toggleButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-controls={contentId}
                    aria-label="Toggle furniture list"
                  />
                }
              >
                {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
              </CollapsibleTrigger>
            </CardAction>
          </CardHeader>

          <CollapsibleContent render={<CardContent id={contentId} />}>
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
                          onFocus={() => {
                            if (!disabled) {
                              onPreviewChange(item.id, 'outliner-focus')
                            }
                          }}
                          onBlur={() => {
                            if (!disabled) {
                              onPreviewChange(null, 'outliner-focus')
                            }
                          }}
                          onPointerEnter={() => {
                            if (!disabled) {
                              onPreviewChange(item.id, 'outliner-hover')
                            }
                          }}
                          onPointerLeave={() => {
                            if (!disabled) {
                              onPreviewChange(null, 'outliner-hover')
                            }
                          }}
                        >
                          <span>{item.name}</span>
                          <span
                            className={cn(
                              isSelected
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground',
                            )}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </section>
  )
}
