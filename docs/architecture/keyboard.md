# Keyboard System

This document covers implementation rules for keyboard input behavior.

For end-user key mappings, see [Editor Shortcuts Reference](../reference/editor-shortcuts-reference.md).

## Input Systems

The app uses two keyboard systems:

- **Discrete shortcuts (press-triggered):** Defined in `src/features/keyboard/use-keyboard-shortcuts.ts`.
- **Held camera motion (state-driven):** Captured in `src/features/keyboard/use-camera-key-state.ts`, consumed per frame in `src/scene/internal/camera/use-camera-key-motion.ts`.

Shortcut metadata lives in `src/features/keyboard/keyboard-shortcuts.definitions.ts`, and both the dispatcher and help dialog derive from that shared source so labels and execution rules stay in sync.

The split exists because press actions and continuous camera motion have different timing and suppression needs.

## Discrete Shortcut Model

Each shortcut runs through three phases:

1. **Match:** Combo matches and is allowed in current target context.
2. **Suppress:** Browser default is prevented based on `suppressionMode`.
3. **Execute:** Action runs only if execution gates pass.

Shortcuts never match while focus is in an editing target (input/textarea/select/contenteditable), so native text-editing behavior is preserved there.

### Room-View Focus Scoping

Room-view-scoped shortcuts require the 3D room view to have DOM focus before they can execute. That includes object movement, rotation, deletion, clear-selection (`Escape`), canvas browse, camera preset keys, and camera focus (`F`); held camera motion (orbit/pan/zoom keys) is scoped the same way. This gating is controlled by `requiresRoomViewFocus` in `useKeyboardShortcuts`, so selected-item detail inputs stay isolated from room-view shortcuts while typing.

The 3D room view is a focusable room-view wrapper element with `tabIndex={0}` and visible focus styling. Clicking the canvas or pressing Tab to it acquires focus.

Focus location is tracked by `focus-store` (`focusedSurface`, written by each surface's focus/blur handlers) and read at keydown time, so shortcut gating is always current without prop threading.

Shortcuts without the flag (Undo, Redo, Start Over, the pane-focus shortcuts) remain active regardless of room-view focus.

### Canvas Browse and Dual-Purpose Arrow Keys

Arrow keys serve two roles depending on selection state:

- **With selection:** Arrow keys move the selected item (`move-*` shortcuts).
- **Without selection:** Arrow keys preview the next/previous item in spatial order (`canvas-browse-*` shortcuts).

This dual-purpose dispatch works via shortcut loop fallthrough:

- `move-*` shortcuts use `suppressionMode: 'on-execute'` and `requiresSelection: true`.
- When no selection exists, the move shortcut matches but cannot execute - it falls through.
- `canvas-browse-*` shortcuts are defined after `move-*` shortcuts and only fire when `hasSelection` is false.

Home, End (browse to first/last), Enter, and Space (select the previewed item) are likewise no-selection shortcuts.

The `ShortcutDefinition` and `KeyCombo` shapes (the gating flags, match
alternatives, and `suppressionMode`) are defined in
`use-keyboard-shortcuts.ts`; the type is the reference.

### Modifier Semantics

Unspecified modifiers are treated as `false`.

- `{ key: 'z', ctrlOrMeta: true }` matches Ctrl+Z and Cmd+Z.
- `{ key: 'z', ctrlOrMeta: true, shift: false }` does not match Ctrl+Shift+Z.

If multiple modifier variants should work, define each explicitly.

For layout-independent shortcuts (for example number-row presets and punctuation keys), prefer adding `code` alternatives so the same physical key works across keyboard layouts.

Camera preset shortcuts intentionally keep strict modifier matching. To support common layouts where number-row digits require Shift (for example AZERTY), explicitly define shifted `code` variants (for example `{ code: 'Digit1', shift: true }`) rather than relaxing modifier matching globally.

### Blocking Overlay and Dialog Rules

- `isBlockingOverlayOpen` indicates whether a blocking overlay is open.
- Blocking overlays block execution for all shortcuts.
- The non-blocking Room surface does not set that blocking signal, so shortcuts continue to work when Room is open unless focus is inside a control that already suppresses them.
- `always-on-match` can suppress browser defaults while the blocking-overlay gate is active.
- Escape inside dialogs is not intercepted by clear-selection, so dialogs can handle close behavior natively.

Blocking status is derived from dialog-store active-surface `kind`, not from
dialog-specific boolean flags.

## Held Camera Key Model

Held camera input tracks a `Set<CameraKeyName>`.

Flow:

1. `keydown`/`keyup` update the key-state set.
2. App pushes state to scene with `setCameraKeyState`.
3. Scene reads state in `useFrame` and applies `rotate`/`truck`/`dolly` deltas.

Unlike discrete shortcuts, this path does not use `suppressionMode`.
`use-camera-key-state.ts` normalizes `event.code`/`event.key` variants into
the key-state set; the key maps and per-frame motion constants live in the
code.

### Held-Key Gating and Safety

- Listeners attach only while the editor is enabled, no blocking overlay is
  open, and the room view has focus; detaching resets held state.
- Editing targets and zoom-modifier chords (Ctrl/Cmd + `=`/`-`) are ignored,
  so typing and browser zoom are unaffected.
- `keyup` updates state so release events clear correctly.
- State is reset on window blur and hook cleanup to avoid stuck keys.

## UI Integration Notes

`ToolbarCommandButton` can attach keyboard metadata to controls using `shortcuts` (ARIA keyshortcuts format), and the shared UI renders consistent key hints via `KbdShortcutDisplay`.

Non-shortcut toolbar actions such as `Add Furniture` and `Room` remain buttons in the header toolbar - the first tab stop on the page, a roving composite reached with Tab and walked with arrow keys. They are intentionally discovered there rather than given global key bindings.

Selected-item detail inputs commit their local draft on `Enter` or blur, and `Escape` restores the last committed value. Those fields rely on the shared editing-target checks so room-view shortcuts do not fire while focus is inside a detail input.
