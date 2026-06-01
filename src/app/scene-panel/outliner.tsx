import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
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
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { loadBooleanPreference, saveBooleanPreference } from '@/lib/ui/storage'
import type {
  PanelInteractionSource,
  PanelSelectById,
} from '../scene-interaction.types'
import {
  selectionMetaActions,
  useOutlinerFocusRequest,
} from '@/editor-state/selection-meta-store'
import {
  useItems,
  usePreviewedId,
  useSceneStateStore,
} from '@/editor-state/scene-state-store'
import { useEditorInteractionsEnabled } from '@/editor-state/editor-runtime-store'
import { useIsBlockingOverlayOpen } from '@/editor-state/dialog-store'

const OUTLINER_EXPANDED_PREFERENCE_KEY = 'outliner-expanded'

function loadStoredExpandedState() {
  return loadBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, true)
}

export function Outliner({
  onNavigateBackToSelectionControls,
  onSelectById,
  onPreviewChange,
}: {
  onNavigateBackToSelectionControls?: () => boolean
  onSelectById: PanelSelectById
  onPreviewChange: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
}) {
  const items = useItems()
  const selectedId = useSceneStateStore((state) => state.selectedId)
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const derivedFocusRequest = useOutlinerFocusRequest()
  const previewedId = usePreviewedId({
    isBlockingOverlayOpen,
    editorInteractionsEnabled,
  })
  const disabled = !editorInteractionsEnabled || isBlockingOverlayOpen
  const focusRequest = isBlockingOverlayOpen ? null : derivedFocusRequest
  const headingId = useId()
  const contentId = useId()
  const containerRef = useRef<HTMLElement | null>(null)
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [isExpanded, setIsExpanded] = useState(loadStoredExpandedState)

  useEffect(() => {
    saveBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, isExpanded)
  }, [isExpanded])

  useLayoutEffect(() => {
    if (!focusRequest || disabled) {
      return
    }

    if (!isExpanded) {
      // Keep focus on a visible control when collapsed instead of targeting hidden content.
      toggleButtonRef.current?.focus()
      selectionMetaActions.clearOutlinerFocusRequest()
      return
    }

    if (focusRequest.focusContainer) {
      containerRef.current?.focus()
      selectionMetaActions.clearOutlinerFocusRequest()
      return
    }

    if (focusRequest.targetSelectedId) {
      const selectedButton = buttonRefs.current.get(
        focusRequest.targetSelectedId,
      )

      if (selectedButton) {
        selectedButton.focus()
        selectionMetaActions.clearOutlinerFocusRequest()
        return
      }
    }

    if (items.length === 0) {
      containerRef.current?.focus()
      selectionMetaActions.clearOutlinerFocusRequest()
      return
    }

    const nextIndex = Math.min(
      focusRequest.preferredIndex ?? 0,
      items.length - 1,
    )
    const nextItem = items[Math.max(nextIndex, 0)]
    const nextButton = buttonRefs.current.get(nextItem.id)

    if (!nextButton) {
      return
    }

    nextButton.focus()

    selectionMetaActions.clearOutlinerFocusRequest()
  }, [disabled, focusRequest, isExpanded, items])

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
            <CardTitle id={headingId}>Furniture in room</CardTitle>
            <CardAction>
              <CollapsibleTrigger
                render={
                  <Button
                    ref={toggleButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-controls={contentId}
                    aria-label="Toggle furniture in room"
                  />
                }
              >
                {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
              </CollapsibleTrigger>
            </CardAction>
          </CardHeader>

          <CollapsibleContent render={<CardContent id={contentId} />}>
            {items.length === 0 ? (
              <p className="text-muted-foreground">No furniture in the room.</p>
            ) : (
              <ScrollArea className="max-h-40">
                <ul className="space-y-2" aria-label="Furniture items">
                  {items.map((item, itemIndex) => {
                    const isSelected = item.id === selectedId
                    const isPreviewed = item.id === previewedId && !isSelected

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
                            isPreviewed && 'bg-accent text-accent-foreground',
                          )}
                          onClick={(e) => {
                            const source: PanelInteractionSource =
                              e.detail === 0
                                ? 'panel-keyboard'
                                : 'panel-pointer'
                            onSelectById(item.id, source)
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
                          onKeyDown={(event) => {
                            if (
                              disabled ||
                              event.key !== 'Tab' ||
                              !event.shiftKey ||
                              !onNavigateBackToSelectionControls ||
                              itemIndex !== 0
                            ) {
                              return
                            }

                            if (onNavigateBackToSelectionControls()) {
                              event.preventDefault()
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
