# Keyboard Shortcuts

This document covers implementation rules for keyboard input behavior.

For end-user key mappings, see [Editor Shortcuts Reference](./editor-shortcuts-reference.md).

## Input Systems

The app uses two keyboard systems:

- **Discrete shortcuts (press-triggered):** Defined in `src/app/keyboard/use-keyboard-shortcuts.ts`.
- **Held camera motion (state-driven):** Captured in `src/app/keyboard/use-camera-key-state.ts`, consumed per frame in `src/scene/internal/use-scene-imperative-api.ts`.

The split exists because press actions and continuous camera motion have different timing and suppression needs.

## Discrete Shortcut Model

Each shortcut runs through three phases:

1. **Match:** Combo matches and is allowed in current target context.
2. **Suppress:** Browser default is prevented based on `suppressionMode`.
3. **Execute:** Action runs only if execution gates pass.

This allows browser-native combos (for example Ctrl+N) to be suppressed while still blocking app execution in contexts like text input.

### Room-View Focus Scoping

All room-view-specific shortcuts (object movement, rotation, deletion, canvas browse, and camera preset keys) require the 3D room view to have DOM focus. This is tracked by `roomViewHasFocus` in `useKeyboardShortcuts`.

The 3D room view is a focusable `div` with `tabIndex={0}` and visible focus styling. Clicking the canvas or pressing Tab to it acquires focus.

Global shortcuts (Undo, Redo, New Scene) remain active regardless of room-view focus.

### Canvas Browse and Dual-Purpose Arrow Keys

Arrow keys serve two roles depending on selection state:

- **With selection:** Arrow keys move the selected item (move-\* shortcuts).
- **Without selection:** Arrow keys preview the next/previous item in spatial order (canvas-browse-\* shortcuts).

This dual-purpose dispatch works via shortcut loop fallthrough:

- `move-*` shortcuts use `suppressionMode: 'on-execute'` and `requiresSelection: true`.
- When no selection exists, the move shortcut matches but cannot execute — it falls through.
- `canvas-browse-*` shortcuts are defined after move-\* shortcuts and only fire when `hasSelection` is false.

Home, End, and Enter are canvas-browse-only (no selection) shortcuts.

### ShortcutDefinition Fields

- **id:** Identifier for the shortcut definition.
- **match:** Single `KeyCombo` or array of `KeyCombo` alternatives.
- **allowMatchInEditingTarget:** (optional) Allows matching in input/textarea/select/contenteditable.
- **requiresSelection:** (optional) Blocks execution when `hasSelection` is false.
- **canExecute:** (optional) Extra execution gate for rules not covered by built-in flags.
- **suppressionMode:** (optional) `'always-on-match' | 'on-execute'` (default `'on-execute'`).

### KeyCombo Fields

- **key:** (optional) Key name, case-insensitive.
- **code:** (optional) Physical key code, case-insensitive.
- **ctrlOrMeta:** (optional) Ctrl/Cmd state must match.
- **shift:** (optional) Shift state must match.
- **alt:** (optional) Alt state must match.

At least one of `key` or `code` must be present.

### Modifier Semantics

Unspecified modifiers are treated as `false`.

- `{ key: 'z', ctrlOrMeta: true }` matches Ctrl+Z and Cmd+Z.
- `{ key: 'z', ctrlOrMeta: true, shift: false }` does not match Ctrl+Shift+Z.

If multiple modifier variants should work, define each explicitly.

For layout-robust shortcuts (for example number-row presets and punctuation keys), prefer adding `code` alternatives so the same physical key works across keyboard layouts.

Camera preset shortcuts intentionally keep strict modifier matching. To support common layouts where number-row digits require Shift (for example AZERTY), explicitly define shifted `code` variants (for example `{ code: 'Digit1', shift: true }`) rather than relaxing modifier matching globally.

### Context and Gating

`ShortcutContext` includes:

- `targetIsEditingTarget`
- `targetIsInDialog`
- `isModalOpen`
- `hasSelection`
- `canStartNewScene`

Use built-in flags first:

- Use `requiresSelection` for selection-gated actions.
- Use `allowMatchInEditingTarget` only when browser suppression is needed even in inputs.
- Use `canExecute` only for non-standard conditions.

### Browser-Native Combo Pattern

Use this pattern when browser default should be suppressed but app execution should still be blocked in editing targets:

```typescript
{
  id: 'new-scene',
  match: { key: 'n', ctrlOrMeta: true },
  allowMatchInEditingTarget: true,
  suppressionMode: 'always-on-match',
  canExecute: (context) =>
    context.canStartNewScene && !context.targetIsEditingTarget,
}
```

### Modal and Dialog Rules

- `isModalOpen` blocks execution for all shortcuts.
- `always-on-match` can still suppress browser defaults while modal-gated.
- Escape inside dialogs is not intercepted by clear-selection, so dialogs can handle close behavior natively.

## Held Camera Key Model

Held camera input tracks a `Set<CameraKeyName>`.

Flow:

1. `keydown`/`keyup` update the key-state set.
2. App pushes state to scene with `setCameraKeyState`.
3. Scene reads state in `useFrame` and applies `rotate`/`truck`/`dolly` deltas.

Unlike discrete shortcuts, this path does not use `suppressionMode`.

### Normalization

`use-camera-key-state.ts` normalizes both `event.code` and `event.key`:

- `W/A/S/D`: key codes and letter variants.
- `Shift`: left/right shift codes.
- Zoom-in: `Equal`, `=`, `+`, `NumpadAdd`.
- Zoom-out: `Minus`, `-`, `_`, `NumpadSubtract`.

### Held-Key Gating and Safety

- `keydown` is ignored in editing targets and dialogs.
- `keyup` still updates state so release events clear correctly.
- State is reset on window blur and hook cleanup to avoid stuck keys.

### Frame Behavior

- `W/A/S/D` without Shift: orbit.
- `Shift+W/A/S/D`: pan.
- `=` / `-`: zoom.
- If both zoom directions are held, `=` wins.
- Frame delta is capped at `0.05` seconds to avoid large jumps after frame stalls.

## UI Integration Notes

`ToolButton` can attach keyboard metadata to controls using `shortcuts` (ARIA keyshortcuts format), and the shared UI renders consistent key hints via `KbdShortcutDisplay`.
