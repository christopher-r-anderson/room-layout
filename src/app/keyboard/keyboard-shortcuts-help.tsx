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

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    sectionTitle: '3D Room View (No Selection)',
    groups: [
      {
        groupLabel: 'Browse',
        rows: [
          {
            label: 'Preview next item',
            combos: [['ArrowRight'], ['ArrowDown']],
          },
          {
            label: 'Preview previous item',
            combos: [['ArrowLeft'], ['ArrowUp']],
          },
          { label: 'Preview first/last', combos: [['Home'], ['End']] },
          { label: 'Select previewed item', combos: [['Enter'], ['Space']] },
        ],
      },
      {
        groupLabel: 'Selection',
        rows: [{ label: 'Clear preview/selection', combos: [['Escape']] }],
      },
    ],
  },
  {
    sectionTitle: 'Camera Controls',
    groups: [
      {
        groupLabel: 'View Presets',
        rows: [
          { label: 'Corner', combos: [['1']] },
          { label: 'Front', combos: [['2']] },
          { label: 'Side', combos: [['3']] },
          { label: 'Top', combos: [['4']] },
        ],
      },
      {
        groupLabel: 'Focus',
        rows: [{ label: 'Focus selected item', combos: [['F']] }],
      },
      {
        groupLabel: 'Motion (Hold)',
        rows: [
          { label: 'Orbit camera', combos: [['W'], ['A'], ['S'], ['D']] },
          {
            label: 'Pan camera',
            combos: [
              ['Shift', 'W'],
              ['Shift', 'A'],
              ['Shift', 'S'],
              ['Shift', 'D'],
            ],
          },
          { label: 'Zoom in/out', combos: [['='], ['-']] },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Selected Item',
    groups: [
      {
        groupLabel: 'Move',
        rows: [
          { label: 'Nudge selected item (0.5 m)', combos: [['Arrow']] },
          { label: 'Move farther (1.0 m)', combos: [['Shift', 'Arrow']] },
          { label: 'Move finely (0.1 m)', combos: [['Alt', 'Arrow']] },
        ],
      },
      {
        groupLabel: 'Rotate',
        rows: [
          { label: 'Rotate counterclockwise', combos: [[',']] },
          { label: 'Rotate clockwise', combos: [['.']] },
        ],
      },
      {
        groupLabel: 'Actions',
        rows: [
          { label: 'Remove item', combos: [['Delete'], ['Backspace']] },
          { label: 'Clear selection', combos: [['Escape']] },
        ],
      },
      {
        groupLabel: 'Details',
        rows: [
          { label: 'Apply typed detail value', combos: [['Enter']] },
          { label: 'Cancel typed detail draft', combos: [['Escape']] },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Scene/Global',
    groups: [
      {
        groupLabel: 'History',
        rows: [
          {
            label: 'Undo',
            combos: [
              ['Ctrl', 'Z'],
              ['Cmd', 'Z'],
            ],
          },
          {
            label: 'Redo',
            combos: [
              ['Ctrl', 'Shift', 'Z'],
              ['Ctrl', 'Y'],
              ['Cmd', 'Shift', 'Z'],
              ['Cmd', 'Y'],
            ],
          },
        ],
      },
      {
        groupLabel: 'Scene',
        rows: [
          {
            label: 'Start Over',
            combos: [
              ['Ctrl', 'Alt', 'N'],
              ['Cmd', 'Opt', 'N'],
            ],
          },
        ],
      },
    ],
  },
]

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
            focused. Use the top controls for Add Furniture, Environment,
            sharing, and other scene actions.
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
