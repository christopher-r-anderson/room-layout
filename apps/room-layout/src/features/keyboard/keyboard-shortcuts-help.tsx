import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Card } from '@/shared/ui/card'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Fragment } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import type { MessageDescriptor } from '@lingui/core'
import {
  KEYBOARD_SHORTCUTS,
  type KeyboardShortcutDefinition,
  type ShortcutComboLabel,
  type ShortcutKeyLabel,
} from './keyboard-shortcuts.definitions'

type ShortcutCombo = ShortcutComboLabel

interface ShortcutRow {
  label: MessageDescriptor
  combos: ShortcutCombo[]
}

interface ShortcutGroup {
  groupLabel: MessageDescriptor
  rows: ShortcutRow[]
}

interface ShortcutSection {
  sectionTitle: MessageDescriptor
  groups: ShortcutGroup[]
}

function buildShortcutSections(
  shortcuts: readonly KeyboardShortcutDefinition[],
): ShortcutSection[] {
  const sections = new Map<
    string,
    {
      sectionTitle: MessageDescriptor
      sectionOrder: number
      groups: Map<
        string,
        {
          groupLabel: MessageDescriptor
          groupOrder: number
          rows: Map<
            string,
            {
              label: MessageDescriptor
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
      const sectionKey = [
        helpEntry.sectionOrder,
        helpEntry.sectionTitle.id,
      ].join(':')
      const groupKey = [helpEntry.groupOrder, helpEntry.groupLabel.id].join(':')
      const rowKey = [helpEntry.rowOrder, helpEntry.rowLabel.id].join(':')

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

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const { i18n } = useLingui()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="keyboard-shortcuts-dialog"
        className="max-h-[calc(100dvh-2rem)] gap-3 sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>
            <Trans>Keyboard Shortcuts</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Quick reference for room-view, camera, selected item, and scene
              shortcuts. Most shortcuts below work only while the 3D room view
              is focused. Use the header controls for Add Furniture and Room,
              then open More on mobile for sharing and the other scene actions.
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(75vh,calc(100dvh-10rem))]">
          <div className="grid gap-4 pb-2 pe-3">
            {SHORTCUT_SECTIONS.map((section) => {
              const sectionTitle = i18n._(section.sectionTitle)

              return (
                <Card key={section.sectionTitle.id} className="py-0">
                  <div className="overflow-x-auto">
                    <table className="w-full caption-top text-xs">
                      <caption className="border-b border-border/70 bg-muted/35 px-4 py-3 text-start text-sm font-semibold tracking-[0.01em] text-foreground">
                        {sectionTitle}
                      </caption>
                      <tbody>
                        {section.groups.flatMap((shortcutGroup, groupIndex) => {
                          const groupLabel = i18n._(shortcutGroup.groupLabel)

                          return shortcutGroup.rows.map(
                            (shortcutRow, rowIndex) => {
                              const rowLabel = i18n._(shortcutRow.label)

                              return (
                                <tr
                                  key={`${shortcutGroup.groupLabel.id}-${shortcutRow.label.id}`}
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
                                      className="w-24 min-w-24 px-4 py-3 text-start align-top font-semibold text-foreground"
                                    >
                                      {groupLabel}
                                    </th>
                                  ) : null}
                                  <th
                                    scope="row"
                                    className="w-56 min-w-56 px-4 py-3 text-start align-top font-normal whitespace-nowrap text-foreground"
                                  >
                                    {rowLabel}
                                  </th>
                                  <td className="px-4 py-3 text-end">
                                    {renderShortcutCombos(shortcutRow.combos)}
                                  </td>
                                </tr>
                              )
                            },
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
