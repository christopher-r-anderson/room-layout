import type { KeyCombo } from '@/lib/ui/keyboard-shortcut-matcher'

export type SuppressionMode = 'always-on-match' | 'on-execute'

type KeyboardShortcutHandler =
  | 'use-keyboard-shortcuts'
  | 'use-camera-key-state'
  | 'native-input'

interface ShortcutPlatformLabel {
  kind: 'platform'
  appleLabel: string
  defaultLabel: string
}

interface ShortcutAlternativesLabel {
  kind: 'alternatives'
  labels: string[]
}

export type ShortcutKeyLabel =
  | string
  | ShortcutPlatformLabel
  | ShortcutAlternativesLabel

export type ShortcutComboLabel = ShortcutKeyLabel[]

interface ShortcutHelpEntry {
  sectionTitle: string
  sectionOrder: number
  groupLabel: string
  groupOrder: number
  rowLabel: string
  rowOrder: number
  comboLabels: ShortcutComboLabel[]
}

export interface KeyboardShortcutDefinition {
  id: string
  match: KeyCombo | KeyCombo[]
  handler: KeyboardShortcutHandler
  helpEntries: ShortcutHelpEntry[]
  allowMatchInEditingTarget?: boolean
  requiresRoomViewFocus?: boolean
  requiresSelection?: boolean
  requiresNoSelection?: boolean
  requiresStartOverCapability?: boolean
  suppressionMode?: SuppressionMode
}

// Order matters: dispatch precedence in useKeyboardShortcuts follows array order.
const PRIMARY_MODIFIER_LABEL: ShortcutPlatformLabel = {
  kind: 'platform',
  appleLabel: 'Cmd',
  defaultLabel: 'Ctrl',
}

const ALT_MODIFIER_LABEL: ShortcutPlatformLabel = {
  kind: 'platform',
  appleLabel: 'Opt',
  defaultLabel: 'Alt',
}

const WASD_ALTERNATIVES_LABEL: ShortcutAlternativesLabel = {
  kind: 'alternatives',
  labels: ['W', 'A', 'S', 'D'],
}

export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcutDefinition[] = [
  {
    id: 'undo',
    match: { key: 'z', ctrlOrMeta: true },
    handler: 'use-keyboard-shortcuts',
    suppressionMode: 'always-on-match',
    helpEntries: [
      {
        sectionTitle: 'Scene/Global',
        sectionOrder: 4,
        groupLabel: 'History',
        groupOrder: 1,
        rowLabel: 'Undo',
        rowOrder: 1,
        comboLabels: [[PRIMARY_MODIFIER_LABEL, 'Z']],
      },
    ],
  },
  {
    id: 'redo',
    match: [
      { key: 'z', ctrlOrMeta: true, shift: true },
      { key: 'y', ctrlOrMeta: true },
    ],
    handler: 'use-keyboard-shortcuts',
    suppressionMode: 'always-on-match',
    helpEntries: [
      {
        sectionTitle: 'Scene/Global',
        sectionOrder: 4,
        groupLabel: 'History',
        groupOrder: 1,
        rowLabel: 'Redo',
        rowOrder: 2,
        comboLabels: [
          [PRIMARY_MODIFIER_LABEL, 'Shift', 'Z'],
          [PRIMARY_MODIFIER_LABEL, 'Y'],
        ],
      },
    ],
  },
  {
    id: 'start-over',
    match: { key: 'n', ctrlOrMeta: true, alt: true },
    handler: 'use-keyboard-shortcuts',
    requiresStartOverCapability: true,
    helpEntries: [
      {
        sectionTitle: 'Scene/Global',
        sectionOrder: 4,
        groupLabel: 'Scene',
        groupOrder: 2,
        rowLabel: 'Start Over',
        rowOrder: 1,
        comboLabels: [[PRIMARY_MODIFIER_LABEL, ALT_MODIFIER_LABEL, 'N']],
      },
    ],
  },
  {
    id: 'delete',
    match: [{ key: 'delete' }, { key: 'backspace' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Actions',
        groupOrder: 3,
        rowLabel: 'Remove item',
        rowOrder: 1,
        comboLabels: [['Delete'], ['Backspace']],
      },
    ],
  },
  {
    id: 'focus-selected',
    match: { key: 'f' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'Focus',
        groupOrder: 2,
        rowLabel: 'Focus selected item',
        rowOrder: 1,
        comboLabels: [['F']],
      },
    ],
  },
  {
    id: 'preset-corner',
    match: [{ key: '1' }, { code: 'Digit1', shift: true }, { code: 'Numpad1' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'View Presets',
        groupOrder: 1,
        rowLabel: 'Corner',
        rowOrder: 1,
        comboLabels: [['1']],
      },
    ],
  },
  {
    id: 'preset-front',
    match: [{ key: '2' }, { code: 'Digit2', shift: true }, { code: 'Numpad2' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'View Presets',
        groupOrder: 1,
        rowLabel: 'Front',
        rowOrder: 2,
        comboLabels: [['2']],
      },
    ],
  },
  {
    id: 'preset-side',
    match: [{ key: '3' }, { code: 'Digit3', shift: true }, { code: 'Numpad3' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'View Presets',
        groupOrder: 1,
        rowLabel: 'Side',
        rowOrder: 3,
        comboLabels: [['3']],
      },
    ],
  },
  {
    id: 'preset-top',
    match: [{ key: '4' }, { code: 'Digit4', shift: true }, { code: 'Numpad4' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'View Presets',
        groupOrder: 1,
        rowLabel: 'Top',
        rowOrder: 4,
        comboLabels: [['4']],
      },
    ],
  },
  {
    id: 'move-up',
    match: { key: 'ArrowUp' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Nudge selected item (0.5 m)',
        rowOrder: 1,
        comboLabels: [['Arrow']],
      },
    ],
  },
  {
    id: 'move-up-large',
    match: { key: 'ArrowUp', shift: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move farther (1.0 m)',
        rowOrder: 2,
        comboLabels: [['Shift', 'Arrow']],
      },
    ],
  },
  {
    id: 'move-up-small',
    match: { key: 'ArrowUp', alt: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move finely (0.1 m)',
        rowOrder: 3,
        comboLabels: [[ALT_MODIFIER_LABEL, 'Arrow']],
      },
    ],
  },
  {
    id: 'move-down',
    match: { key: 'ArrowDown' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Nudge selected item (0.5 m)',
        rowOrder: 1,
        comboLabels: [['Arrow']],
      },
    ],
  },
  {
    id: 'move-down-large',
    match: { key: 'ArrowDown', shift: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move farther (1.0 m)',
        rowOrder: 2,
        comboLabels: [['Shift', 'Arrow']],
      },
    ],
  },
  {
    id: 'move-down-small',
    match: { key: 'ArrowDown', alt: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move finely (0.1 m)',
        rowOrder: 3,
        comboLabels: [[ALT_MODIFIER_LABEL, 'Arrow']],
      },
    ],
  },
  {
    id: 'move-left',
    match: { key: 'ArrowLeft' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Nudge selected item (0.5 m)',
        rowOrder: 1,
        comboLabels: [['Arrow']],
      },
    ],
  },
  {
    id: 'move-left-large',
    match: { key: 'ArrowLeft', shift: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move farther (1.0 m)',
        rowOrder: 2,
        comboLabels: [['Shift', 'Arrow']],
      },
    ],
  },
  {
    id: 'move-left-small',
    match: { key: 'ArrowLeft', alt: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move finely (0.1 m)',
        rowOrder: 3,
        comboLabels: [[ALT_MODIFIER_LABEL, 'Arrow']],
      },
    ],
  },
  {
    id: 'move-right',
    match: { key: 'ArrowRight' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Nudge selected item (0.5 m)',
        rowOrder: 1,
        comboLabels: [['Arrow']],
      },
    ],
  },
  {
    id: 'move-right-large',
    match: { key: 'ArrowRight', shift: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move farther (1.0 m)',
        rowOrder: 2,
        comboLabels: [['Shift', 'Arrow']],
      },
    ],
  },
  {
    id: 'move-right-small',
    match: { key: 'ArrowRight', alt: true },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Move',
        groupOrder: 1,
        rowLabel: 'Move finely (0.1 m)',
        rowOrder: 3,
        comboLabels: [[ALT_MODIFIER_LABEL, 'Arrow']],
      },
    ],
  },
  {
    id: 'rotate-left',
    match: [{ key: ',' }, { code: 'Comma' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Rotate',
        groupOrder: 2,
        rowLabel: 'Rotate counterclockwise',
        rowOrder: 1,
        comboLabels: [[',']],
      },
    ],
  },
  {
    id: 'rotate-right',
    match: [{ key: '.' }, { code: 'Period' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Rotate',
        groupOrder: 2,
        rowLabel: 'Rotate clockwise',
        rowOrder: 2,
        comboLabels: [['.']],
      },
    ],
  },
  {
    id: 'canvas-browse-next',
    match: [{ key: 'ArrowRight' }, { key: 'ArrowDown' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresNoSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: '3D Room View (No Selection)',
        sectionOrder: 1,
        groupLabel: 'Browse',
        groupOrder: 1,
        rowLabel: 'Preview next item',
        rowOrder: 1,
        comboLabels: [['ArrowRight'], ['ArrowDown']],
      },
    ],
  },
  {
    id: 'canvas-browse-prev',
    match: [{ key: 'ArrowLeft' }, { key: 'ArrowUp' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresNoSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: '3D Room View (No Selection)',
        sectionOrder: 1,
        groupLabel: 'Browse',
        groupOrder: 1,
        rowLabel: 'Preview previous item',
        rowOrder: 2,
        comboLabels: [['ArrowLeft'], ['ArrowUp']],
      },
    ],
  },
  {
    id: 'canvas-browse-first',
    match: { key: 'Home' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresNoSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: '3D Room View (No Selection)',
        sectionOrder: 1,
        groupLabel: 'Browse',
        groupOrder: 1,
        rowLabel: 'Preview first/last',
        rowOrder: 3,
        comboLabels: [['Home'], ['End']],
      },
    ],
  },
  {
    id: 'canvas-browse-last',
    match: { key: 'End' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresNoSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: '3D Room View (No Selection)',
        sectionOrder: 1,
        groupLabel: 'Browse',
        groupOrder: 1,
        rowLabel: 'Preview first/last',
        rowOrder: 3,
        comboLabels: [['Home'], ['End']],
      },
    ],
  },
  {
    id: 'canvas-select-previewed',
    match: [{ key: 'Enter' }, { key: ' ' }],
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    requiresNoSelection: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: '3D Room View (No Selection)',
        sectionOrder: 1,
        groupLabel: 'Browse',
        groupOrder: 1,
        rowLabel: 'Select previewed item',
        rowOrder: 4,
        comboLabels: [['Enter'], ['Space']],
      },
    ],
  },
  {
    id: 'clear-selection',
    match: { key: 'Escape' },
    handler: 'use-keyboard-shortcuts',
    requiresRoomViewFocus: true,
    suppressionMode: 'on-execute',
    helpEntries: [
      {
        sectionTitle: '3D Room View (No Selection)',
        sectionOrder: 1,
        groupLabel: 'Selection',
        groupOrder: 2,
        rowLabel: 'Clear preview/selection',
        rowOrder: 1,
        comboLabels: [['Escape']],
      },
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Actions',
        groupOrder: 3,
        rowLabel: 'Clear selection',
        rowOrder: 2,
        comboLabels: [['Escape']],
      },
    ],
  },
  {
    id: 'orbit-camera',
    match: [{ key: 'w' }, { key: 'a' }, { key: 's' }, { key: 'd' }],
    handler: 'use-camera-key-state',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'Motion (Hold)',
        groupOrder: 3,
        rowLabel: 'Orbit camera',
        rowOrder: 1,
        comboLabels: [[WASD_ALTERNATIVES_LABEL]],
      },
    ],
  },
  {
    id: 'pan-camera',
    match: [
      { key: 'w', shift: true },
      { key: 'a', shift: true },
      { key: 's', shift: true },
      { key: 'd', shift: true },
    ],
    handler: 'use-camera-key-state',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'Motion (Hold)',
        groupOrder: 3,
        rowLabel: 'Pan camera',
        rowOrder: 2,
        comboLabels: [['Shift', WASD_ALTERNATIVES_LABEL]],
      },
    ],
  },
  {
    id: 'zoom-camera',
    match: [{ key: '=' }, { key: '-' }],
    handler: 'use-camera-key-state',
    helpEntries: [
      {
        sectionTitle: 'Camera Controls',
        sectionOrder: 2,
        groupLabel: 'Motion (Hold)',
        groupOrder: 3,
        rowLabel: 'Zoom in/out',
        rowOrder: 3,
        comboLabels: [['='], ['-']],
      },
    ],
  },
  {
    id: 'apply-typed-detail-value',
    match: { key: 'Enter' },
    handler: 'native-input',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Details',
        groupOrder: 4,
        rowLabel: 'Apply typed detail value',
        rowOrder: 1,
        comboLabels: [['Enter']],
      },
    ],
  },
  {
    id: 'cancel-typed-detail-draft',
    match: { key: 'Escape' },
    handler: 'native-input',
    helpEntries: [
      {
        sectionTitle: 'Selected Item',
        sectionOrder: 3,
        groupLabel: 'Details',
        groupOrder: 4,
        rowLabel: 'Cancel typed detail draft',
        rowOrder: 2,
        comboLabels: [['Escape']],
      },
    ],
  },
]

export const USE_KEYBOARD_SHORTCUT_DEFINITIONS: KeyboardShortcutDefinition[] =
  KEYBOARD_SHORTCUTS.filter(
    (shortcut) => shortcut.handler === 'use-keyboard-shortcuts',
  )
