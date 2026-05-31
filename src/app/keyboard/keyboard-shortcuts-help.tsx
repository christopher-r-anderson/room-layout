import { IconKeyboard } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ComponentProps, ReactElement } from 'react'
import {
  KEYBOARD_SHORTCUTS,
  type KeyboardShortcutDefinition,
} from './keyboard-shortcuts.definitions'

type ShortcutCombo = string[]

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

function renderShortcutCombos(combos: ShortcutCombo[]) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {combos.map((shortcutCombo, comboIndex) => (
        <div key={shortcutCombo.join('+')} className="contents">
          <KbdGroup>
            {shortcutCombo.map((shortcutKey, keyIndex) => (
              <div key={shortcutKey} className="contents">
                <Kbd>{shortcutKey}</Kbd>
                {keyIndex < shortcutCombo.length - 1 ? <span>+</span> : null}
              </div>
            ))}
          </KbdGroup>
          {comboIndex < combos.length - 1 ? (
            <span className="text-muted-foreground">/</span>
          ) : null}
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
      className="pointer-events-auto rounded-md"
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="sr-only">
                  Keyboard shortcuts quick reference
                </caption>
                {SHORTCUT_SECTIONS.map((section) => (
                  <tbody
                    key={section.sectionTitle}
                    className="border-b border-transparent"
                  >
                    <tr>
                      <th
                        colSpan={3}
                        className="px-0 py-2 pb-1 text-left align-top font-semibold text-foreground"
                      >
                        {section.sectionTitle}
                      </th>
                    </tr>
                    {section.groups.flatMap((shortcutGroup) =>
                      shortcutGroup.rows.map((shortcutRow, rowIndex) => (
                        <tr
                          key={`${shortcutGroup.groupLabel}-${shortcutRow.label}`}
                        >
                          {rowIndex === 0 ? (
                            <th
                              scope="rowgroup"
                              rowSpan={shortcutGroup.rows.length}
                              className="w-18 pr-2 pb-1 text-left align-top font-semibold text-foreground"
                            >
                              {shortcutGroup.groupLabel}
                            </th>
                          ) : null}
                          <th
                            scope="row"
                            className="pr-3 pb-1 text-left align-top font-normal whitespace-nowrap text-foreground"
                          >
                            {shortcutRow.label}
                          </th>
                          <td className="pb-1 text-right">
                            {renderShortcutCombos(shortcutRow.combos)}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                ))}
              </table>
            </div>
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
