import { useState } from 'react'
import { IconKeyboard } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

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
    sectionTitle: 'Selected Object',
    groups: [
      {
        groupLabel: 'Move',
        rows: [
          { label: 'Nudge (0.5 m)', combos: [['Arrow']] },
          { label: 'Farther (1.0 m)', combos: [['Shift', 'Arrow']] },
          { label: 'Fine (0.1 m)', combos: [['Alt', 'Arrow']] },
        ],
      },
      {
        groupLabel: 'Rotate',
        rows: [{ label: 'Selection', combos: [[','], ['.']] }],
      },
      {
        groupLabel: 'Selection',
        rows: [
          { label: 'Delete', combos: [['Delete'], ['Backspace']] },
          { label: 'Clear', combos: [['Escape']] },
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
            label: 'New Scene',
            combos: [
              ['Ctrl', 'N'],
              ['Cmd', 'N'],
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

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Toggle keyboard shortcuts help"
            className="pointer-events-auto"
          />
        }
      >
        <IconKeyboard />
        Keyboard Help
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-88 max-w-[calc(100vw-1rem)] gap-3"
      >
        <PopoverHeader>
          <PopoverTitle>Keyboard Shortcuts</PopoverTitle>
          <PopoverDescription>
            Quick reference for room-view, camera, object, and scene shortcuts.
            Most shortcuts below work only while the 3D room view is focused.
          </PopoverDescription>
        </PopoverHeader>

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
                  className="text-left align-top font-semibold text-foreground py-2 pb-1 px-0"
                >
                  {section.sectionTitle}
                </th>
              </tr>
              {section.groups.flatMap((shortcutGroup) =>
                shortcutGroup.rows.map((shortcutRow, rowIndex) => (
                  <tr key={`${shortcutGroup.groupLabel}-${shortcutRow.label}`}>
                    {rowIndex === 0 ? (
                      <th
                        scope="rowgroup"
                        rowSpan={shortcutGroup.rows.length}
                        className="w-18 pr-2 pb-1 text-left align-top text-foreground font-semibold"
                      >
                        {shortcutGroup.groupLabel}
                      </th>
                    ) : null}
                    <th
                      scope="row"
                      className="pr-3 pb-1 text-left align-top font-normal text-foreground whitespace-nowrap"
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

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false)
            }}
          >
            Dismiss
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
