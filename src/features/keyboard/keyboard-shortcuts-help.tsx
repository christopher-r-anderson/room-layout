import { IconKeyboard } from '@tabler/icons-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Fragment, type ComponentProps, type ReactElement } from 'react'
import {
  KEYBOARD_SHORTCUTS,
  type KeyboardShortcutDefinition,
  type ShortcutComboLabel,
  type ShortcutKeyLabel,
} from './keyboard-shortcuts.definitions'

type ShortcutCombo = ShortcutComboLabel

interface ShortcutRow {
  label: string
  combos: ShortcutCombo[]
}

interface ShortcutGroup {
  groupLabel: string
  rows: ShortcutRow[]
}

interface ShortcutSection {
  sectionTitle: string
  groups: ShortcutGroup[]
}

function buildShortcutSections(
  shortcuts: readonly KeyboardShortcutDefinition[],
): ShortcutSection[] {
  const sections = new Map<
    string,
    {
      sectionTitle: string
      sectionOrder: number
      groups: Map<
        string,
        {
          groupLabel: string
          groupOrder: number
          rows: Map<
            string,
            {
              label: string
              rowOrder: number
              combos: ShortcutCombo[]
            }
          >
        }
      >
    }
  >()

  for (const shortcut of shortcuts) {
    for (const helpEntry of shortcut.helpEntries) {
      const sectionKey = [helpEntry.sectionOrder, helpEntry.sectionTitle].join(
        ':',
      )
      const groupKey = [helpEntry.groupOrder, helpEntry.groupLabel].join(':')
      const rowKey = [helpEntry.rowOrder, helpEntry.rowLabel].join(':')

      let section = sections.get(sectionKey)
      if (!section) {
        section = {
          sectionTitle: helpEntry.sectionTitle,
          sectionOrder: helpEntry.sectionOrder,
          groups: new Map(),
        }
        sections.set(sectionKey, section)
      }

      let group = section.groups.get(groupKey)
      if (!group) {
        group = {
          groupLabel: helpEntry.groupLabel,
          groupOrder: helpEntry.groupOrder,
          rows: new Map(),
        }
        section.groups.set(groupKey, group)
      }

      if (!group.rows.has(rowKey)) {
        group.rows.set(rowKey, {
          label: helpEntry.rowLabel,
          rowOrder: helpEntry.rowOrder,
          combos: helpEntry.comboLabels,
        })
      }
    }
  }

  return [...sections.values()]
    .sort((left, right) => left.sectionOrder - right.sectionOrder)
    .map((section) => ({
      sectionTitle: section.sectionTitle,
      groups: [...section.groups.values()]
        .sort((left, right) => left.groupOrder - right.groupOrder)
        .map((group) => ({
          groupLabel: group.groupLabel,
          rows: [...group.rows.values()]
            .sort((left, right) => left.rowOrder - right.rowOrder)
            .map(({ label, combos }) => ({ label, combos })),
        })),
    }))
}

const SHORTCUT_SECTIONS = buildShortcutSections(KEYBOARD_SHORTCUTS)

function isAppleKeyboardPlatform() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const platformSignals = [navigator.platform, navigator.userAgent]
    .filter(Boolean)
    .join(' ')

  return /mac|iphone|ipad|ipod/i.test(platformSignals)
}

function renderShortcutKeyLabel(
  shortcutKey: ShortcutKeyLabel,
  preferAppleLabels: boolean,
) {
  if (typeof shortcutKey === 'string') {
    return <Kbd>{shortcutKey}</Kbd>
  }

  if (shortcutKey.kind === 'platform') {
    return (
      <Kbd>
        {preferAppleLabels ? shortcutKey.appleLabel : shortcutKey.defaultLabel}
      </Kbd>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {shortcutKey.labels.map((shortcutAlternative, alternativeIndex) => (
        <Fragment key={shortcutAlternative}>
          <Kbd>{shortcutAlternative}</Kbd>
          {alternativeIndex < shortcutKey.labels.length - 1 ? (
            <span className="text-muted-foreground">/</span>
          ) : null}
        </Fragment>
      ))}
    </span>
  )
}

function renderShortcutCombos(combos: ShortcutCombo[]) {
  const preferAppleLabels = isAppleKeyboardPlatform()

  return (
    <div className="flex flex-col items-end gap-1.5">
      {combos.map((shortcutCombo, comboIndex) => (
        <div key={comboIndex} className="flex justify-end">
          <KbdGroup className="justify-end">
            {shortcutCombo.map((shortcutKey, keyIndex) => (
              <Fragment key={keyIndex}>
                {renderShortcutKeyLabel(shortcutKey, preferAppleLabels)}
                {keyIndex < shortcutCombo.length - 1 ? (
                  <span className="text-muted-foreground">+</span>
                ) : null}
              </Fragment>
            ))}
          </KbdGroup>
        </div>
      ))}
    </div>
  )
}

function KeyboardShortcutsTriggerButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-controls="keyboard-shortcuts-dialog"
      aria-haspopup="dialog"
      aria-label="Keyboard shortcuts"
      className="rounded-md"
      {...props}
    >
      <IconKeyboard size={20} aria-hidden="true" />
    </Button>
  )
}

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerButton?: ReactElement | null
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  triggerButton,
}: KeyboardShortcutsDialogProps) {
  const resolvedTriggerButton =
    triggerButton === undefined ? (
      <KeyboardShortcutsTriggerButton />
    ) : (
      triggerButton
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {resolvedTriggerButton ? (
        <Tooltip>
          <TooltipTrigger
            render={<DialogTrigger render={resolvedTriggerButton} />}
          />
          <TooltipContent side="bottom">Keyboard shortcuts</TooltipContent>
        </Tooltip>
      ) : null}

      <DialogContent
        id="keyboard-shortcuts-dialog"
        className="max-h-[calc(100dvh-2rem)] gap-3 sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick reference for room-view, camera, selected item, and scene
            shortcuts. Most shortcuts below work only while the 3D room view is
            focused. Use the header controls for Add Furniture and Room, then
            open More on mobile for sharing and the other scene actions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(75vh,calc(100dvh-10rem))]">
          <div className="grid gap-4 pb-2 pr-3">
            {SHORTCUT_SECTIONS.map((section) => (
              <div
                key={section.sectionTitle}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm"
              >
                <div className="overflow-x-auto">
                  <table className="w-full caption-top text-xs">
                    <caption className="border-b border-border/70 bg-muted/35 px-4 py-3 text-left text-sm font-semibold tracking-[0.01em] text-foreground">
                      {section.sectionTitle}
                    </caption>
                    <tbody>
                      {section.groups.flatMap((shortcutGroup, groupIndex) =>
                        shortcutGroup.rows.map((shortcutRow, rowIndex) => (
                          <tr
                            key={`${shortcutGroup.groupLabel}-${shortcutRow.label}`}
                            className={[
                              groupIndex > 0 && rowIndex === 0
                                ? 'border-t border-border/70'
                                : '',
                              rowIndex % 2 === 0
                                ? 'bg-background/65'
                                : 'bg-muted/20',
                              'transition-colors hover:bg-accent/35',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {rowIndex === 0 ? (
                              <th
                                scope="rowgroup"
                                rowSpan={shortcutGroup.rows.length}
                                className="w-24 min-w-24 px-4 py-3 text-left align-top font-semibold text-foreground"
                              >
                                {shortcutGroup.groupLabel}
                              </th>
                            ) : null}
                            <th
                              scope="row"
                              className="w-56 min-w-56 px-4 py-3 text-left align-top font-normal whitespace-nowrap text-foreground"
                            >
                              {shortcutRow.label}
                            </th>
                            <td className="px-4 py-3 text-right">
                              {renderShortcutCombos(shortcutRow.combos)}
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsHelp(props: KeyboardShortcutsHelpProps) {
  return <KeyboardShortcutsDialog {...props} />
}
