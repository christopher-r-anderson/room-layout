import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'
import { cn } from '@/shared/lib/utils'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import {
  loadBooleanPreference,
  saveBooleanPreference,
} from '@/shared/lib/ui/storage'
import { selectById } from '@/core/operations/selection-actions'
import { previewFromOutliner } from '@/core/operations/preview-actions'
import {
  selectionActions,
  useOutlinerFocusRequest,
  type PanelInteractionSource,
} from '@/core/stores/selection-store'
import { useItems } from '@/core/stores/scene-document-store'
import { useSelectedId } from '@/core/stores/selection-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { Trans, useLingui } from '@lingui/react/macro'

const OUTLINER_EXPANDED_PREFERENCE_KEY = 'outliner-expanded'

function loadStoredExpandedState() {
  return loadBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, true)
}

export function Outliner({
  ref,
  className,
}: {
  ref?: Ref<HTMLElement>
  className?: string
}) {
  const { t } = useLingui()
  const items = useItems()
  const selectedId = useSelectedId()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const derivedFocusRequest = useOutlinerFocusRequest()
  const previewedId = usePreviewedId()
  const disabled = isBlockingOverlayOpen
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
      selectionActions.clearOutlinerFocusRequest()
      return
    }

    if (focusRequest.focusContainer) {
      containerRef.current?.focus()
      selectionActions.clearOutlinerFocusRequest()
      return
    }

    if (focusRequest.targetSelectedId) {
      const selectedButton = buttonRefs.current.get(
        focusRequest.targetSelectedId,
      )

      if (selectedButton) {
        selectedButton.focus()
        selectionActions.clearOutlinerFocusRequest()
        return
      }
    }

    if (items.length === 0) {
      containerRef.current?.focus()
      selectionActions.clearOutlinerFocusRequest()
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

    selectionActions.clearOutlinerFocusRequest()
  }, [disabled, focusRequest, isExpanded, items])

  return (
    <section
      ref={(node) => {
        containerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }}
      className={className}
      aria-labelledby={headingId}
      tabIndex={-1}
    >
      <Card size="sm" variant="overlay" className="w-full">
        <Collapsible
          open={isExpanded}
          onOpenChange={setIsExpanded}
          className="w-full"
        >
          <CardHeader>
            <CardTitle id={headingId}>
              <Trans>Furniture in room</Trans>
            </CardTitle>
            <CardAction>
              <CollapsibleTrigger
                render={
                  <Button
                    ref={toggleButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-controls={contentId}
                    aria-label={t`Toggle furniture list visibility`}
                    className="mb-2"
                  />
                }
              >
                {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
              </CollapsibleTrigger>
            </CardAction>
          </CardHeader>

          <CollapsibleContent render={<CardContent id={contentId} />}>
            {items.length === 0 ? (
              <p className="text-muted-foreground">
                <Trans>No furniture in the room.</Trans>
              </p>
            ) : (
              <ScrollArea className="max-h-40">
                <ul className="space-y-2" aria-label={t`Furniture items`}>
                  {items.map((item) => {
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
                          data-previewed={isPreviewed ? true : undefined}
                          disabled={disabled}
                          className={cn(
                            buttonVariants({
                              variant: isSelected ? 'secondary' : 'outline',
                              size: 'sm',
                            }),
                            'w-full justify-between text-start',
                            'data-[previewed]:bg-accent data-[previewed]:text-accent-foreground',
                          )}
                          onClick={(e) => {
                            const source: PanelInteractionSource =
                              e.detail === 0
                                ? 'panel-keyboard'
                                : 'panel-pointer'
                            selectById(item.id, source)
                          }}
                          onFocus={() => {
                            if (!disabled) {
                              previewFromOutliner(item.id, 'outliner-focus')
                            }
                          }}
                          onBlur={() => {
                            if (!disabled) {
                              previewFromOutliner(null, 'outliner-focus')
                            }
                          }}
                          onPointerEnter={() => {
                            if (!disabled) {
                              previewFromOutliner(item.id, 'outliner-hover')
                            }
                          }}
                          onPointerLeave={() => {
                            if (!disabled) {
                              previewFromOutliner(null, 'outliner-hover')
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
                            {isSelected ? (
                              <Trans>Selected</Trans>
                            ) : (
                              <Trans>Select</Trans>
                            )}
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
