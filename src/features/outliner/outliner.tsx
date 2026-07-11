import {
  useCallback,
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
import { type PanelInteractionSource } from '@/core/stores/selection-store'
import { useItems } from '@/core/stores/scene-document-store'
import { useSelectedId } from '@/core/stores/selection-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { focusActions, usePendingFocus } from '@/core/stores/focus-store'
import { isFocusLeaving } from '@/shared/lib/focus'
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
  const pendingFocus = usePendingFocus()
  const previewedId = usePreviewedId()
  const disabled = isBlockingOverlayOpen
  const directive =
    pendingFocus?.surface === 'item-collection' ? pendingFocus : null
  const headingId = useId()
  const contentId = useId()
  const containerRef = useRef<HTMLElement | null>(null)
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [isExpanded, setIsExpanded] = useState(loadStoredExpandedState)
  const focusedRowIndexRef = useRef<number | null>(null)

  useEffect(() => {
    saveBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, isExpanded)
  }, [isExpanded])

  // Repairs focus when the focused row is removed by a mutation (undo/redo,
  // reload): element removal fires no blur, so DOM focus silently falls to the
  // body. Within-surface landing is this surface's concern - repair to the
  // nearest remaining row, else the container.
  useLayoutEffect(() => {
    const focusedRowIndex = focusedRowIndexRef.current

    if (focusedRowIndex === null || document.activeElement !== document.body) {
      return
    }

    focusedRowIndexRef.current = null

    if (items.length === 0) {
      containerRef.current?.focus()
      return
    }

    const nextIndex = Math.min(focusedRowIndex, items.length - 1)
    buttonRefs.current.get(items[nextIndex].id)?.focus()
  }, [items])

  // Realizes item-collection focus directives: the resolver picked this
  // surface, the cascade below picks the element (target, with fallbacks, down
  // to the container). Defers without clearing while a blocking overlay is up;
  // the pending-focus reconciler clears directives that must not fire.
  useLayoutEffect(() => {
    if (!directive || disabled) {
      return
    }

    if (!isExpanded) {
      // Keep focus on a visible control when collapsed instead of targeting hidden content.
      toggleButtonRef.current?.focus()
      focusActions.directiveRealized(directive)
      return
    }

    const { target } = directive

    if (target.kind === 'container' || items.length === 0) {
      containerRef.current?.focus()
      focusActions.directiveRealized(directive)
      return
    }

    if (target.kind === 'item' || target.kind === 'auto') {
      const preferredId =
        target.kind === 'item' ? target.itemId : (selectedId ?? items[0].id)
      const preferredButton = buttonRefs.current.get(preferredId)

      if (preferredButton) {
        preferredButton.focus()
        focusActions.directiveRealized(directive)
        return
      }
    }

    const nextIndex = Math.min(
      target.kind === 'index' ? target.index : 0,
      items.length - 1,
    )
    const nextItem = items[Math.max(nextIndex, 0)]
    const nextButton = buttonRefs.current.get(nextItem.id)

    if (!nextButton) {
      return
    }

    nextButton.focus()

    focusActions.directiveRealized(directive)
  }, [directive, disabled, isExpanded, items, selectedId])

  // Stable so React only calls it on real mount/unmount; unmounting while
  // focused (e.g. resize to mobile) fires no blur event, so the claim is
  // released here.
  const sectionRef = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
      if (node === null) {
        focusActions.surfaceBlurred('item-collection')
      }
    },
    [ref],
  )

  return (
    <section
      ref={sectionRef}
      className={className}
      aria-labelledby={headingId}
      tabIndex={-1}
      onFocus={() => {
        focusActions.surfaceFocused('item-collection')
      }}
      onBlur={(event) => {
        if (isFocusLeaving(event)) {
          focusActions.surfaceBlurred('item-collection')
        }
      }}
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
                            focusedRowIndexRef.current = items.indexOf(item)
                            if (!disabled) {
                              previewFromOutliner(item.id, 'outliner-focus')
                            }
                          }}
                          onBlur={() => {
                            focusedRowIndexRef.current = null
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
