# Keyboard Shortcuts

This project uses a declarative shortcut system defined in `src/app/keyboard/use-keyboard-shortcuts.ts`. All global editor shortcuts (undo, delete, movement, etc.) are centralized in one shortcut table.

## Architecture

The system splits shortcut handling into three phases:

1. **Match phase:** Does the key combo match, and is it allowed to match in the current context?
2. **Suppress phase:** Prevent browser default (triggered for all matched shortcuts).
3. **Execute phase:** Only run the action if execution conditions are met (modal open? selection exists? feature enabled?).

This split allows browser-native combos (like Ctrl+N for new window) to be suppressed while still blocking execution of the related action if needed.

## Defining Shortcuts

All shortcuts are defined in the `shortcutDefinitions` array:

```typescript
const shortcutDefinitions: ShortcutDefinition[] = [
  {
    id: 'undo',
    match: { key: 'z', ctrlOrMeta: true, shift: false },
  },
  {
    id: 'new-scene',
    match: { key: 'n', ctrlOrMeta: true, shift: false },
    allowMatchInEditingTarget: true,
    canExecute: (context) =>
      context.canStartNewScene && !context.targetIsEditingTarget,
  },
]
```

### ShortcutDefinition Fields

- **id:** Unique identifier; must match a case in the `runShortcut` switch statement.
- **match:** Single `KeyCombo` or array of `KeyCombo` objects. Shortcut is matched if any combo matches.
- **allowMatchInEditingTarget:** (optional) If `true`, shortcut matches inside input/textarea/select/contenteditable. Default is `false` (blocked). Use for shortcuts that need browser suppression even while typing.
- **requiresSelection:** (optional) If `true`, execution is blocked when `hasSelection` is `false`.
- **canExecute:** (optional) Function for custom execution checks. Receives the current `ShortcutContext` and returns boolean.

### KeyCombo Fields

- **key:** The key name (case-insensitive matching). Examples: `'z'`, `'n'`, `'ArrowUp'`, `'Delete'`, `'Escape'`.
- **ctrlOrMeta:** (optional) If specified, must match Ctrl-or-Cmd state. Omitted behaves like `false`.
- **shift:** (optional) If specified, must match shift state. Omitted behaves like `false`.
- **alt:** (optional) If specified, must match alt state. Omitted behaves like `false`.

## Modifier Semantics

Modifiers follow a strict rule: **unspecified means not pressed.**

- `{ key: 'z', ctrlOrMeta: true, shift: false }` matches Ctrl+Z and Cmd+Z, but not Ctrl+Shift+Z.
- `{ key: 'z', ctrlOrMeta: true }` matches Ctrl+Z and Cmd+Z.
- `{ key: 'f' }` matches plain F only.
- `{ key: 'ArrowRight', shift: true }` matches only Shift+ArrowRight.

If a shortcut should work with multiple modifier variants, define each variant explicitly.

This project prefers explicit definitions over wildcard matching. That keeps shortcut behavior in one place and avoids splitting meaning between the matcher and the executor.

### Ctrl/Meta Unification

Use `ctrlOrMeta` instead of separate `ctrl` and `meta` fields. This keeps definitions clean and acknowledges that Ctrl is Windows/Linux convention and Cmd is macOS convention for the same logical action.

## Context and Gating

The `ShortcutContext` provided to `canMatch` and `canExecute` includes:

- **targetIsEditingTarget:** True if event target is input/textarea/select/contenteditable.
- **targetIsInDialog:** True if target is inside `[role="dialog"]` or `[role="alertdialog"]`.
- **isModalOpen:** True if an overlay/modal is currently displayed.
- **hasSelection:** True if an item is currently selected in the editor.
- **canStartNewScene:** True if the new-scene action is allowed (not at defaults).

## Dialog and Escape Handling

**Escape in dialogs is special.** When Escape originates inside a dialog, it is not intercepted for the app's clear-selection handler. This allows dialogs to handle Escape natively (e.g., closing the dialog).

If you want Escape to work elsewhere while dialogs are open, use the modal execution gate:

```typescript
if (shortcut.requiresSelection && !context.hasSelection) {
  return false
}
```

(The execute phase also checks `isModalOpen` globally, preventing all selection-gated actions while a modal is open.)

## Modal Suppression

When `isModalOpen` is true:

- **Matched shortcuts still suppress browser default.** This prevents Ctrl+N from opening a new window while your app's dialog is focused.
- **Execution is blocked.** `onNewSceneIntent()`, `onUndo()`, etc. are not called.

This two-phase approach gives dialogs clean keyboard control while preventing accidental browser interactions.

## Browser Native Combos

Some key combos are handled by the browser or OS (Ctrl+W to close tab, Ctrl+S to save, Ctrl+Q to quit). To prevent these from firing while your UI is focused, use `allowMatchInEditingTarget: true` and ensure your action suppresses the default without executing if conditions aren't met.

Example: Ctrl+N (browser new window)

```typescript
{
  id: 'new-scene',
  match: { key: 'n', ctrlOrMeta: true, shift: false },
  allowMatchInEditingTarget: true,  // match even in inputs
  canExecute: (context) =>
    context.canStartNewScene && !context.targetIsEditingTarget,  // but don't execute in inputs
}
```

This prevents the browser from opening a new window while still suppressing the keystroke.

## Explicit Action Variants

Movement and rotation use explicit shortcut variants instead of broad matches with event-dependent branching.

- `ArrowRight` is its own action.
- `Shift+ArrowRight` is its own action.
- `Alt+ArrowRight` is its own action.
- `Q` and `E` are separate rotate actions.

This keeps the shortcut table declarative:

- The definition describes the exact combo.
- The definition describes the exact action.
- The executor does not need to decode modifier meaning from the event.

If you add a new shortcut family with modifier-based variants, prefer defining each variant explicitly unless the modifiers are truly interchangeable.

## Custom Execution Functions

Use `canExecute` for feature-level checks that don't fit the standard gates:

```typescript
{
  id: 'custom-action',
  match: { key: 'x' },
  canExecute: (context) => {
    // Only allow if a specific menu is open, or feature is enabled
    return myFeatureIsEnabled && context.hasSelection
  },
}
```

## Accessibility and UI Integration

### ToolButton Integration

Use `ToolButton` to pair a button action with keyboard shortcuts and automatic ARIA/tooltip annotations:

```typescript
<ToolButton
  action={() => onMoveSelection({ x: 0, z: -0.5 })}
  disabled={controlsDisabled}
  disabledMessage="No item selected"
  shortcuts="ArrowUp Shift+ArrowUp Alt+ArrowUp"
  label="Move Up"
  visibleLabel="Up"
  shortcutHint="Keyboard: Shift moves farther. Alt moves finely."
  icon={<IconArrowUp />}
/>
```

**ToolButton automatically:**

- Adds `aria-keyshortcuts` for screen reader discovery.
- Displays shortcuts in a tooltip using `KbdShortcutDisplay`.
- Shows the disabled reason on hover when disabled.

### Shortcut String Format

The `shortcuts` prop uses the ARIA keyshortcuts format (space-separated, `+` for modifiers):

- Single key: `"Escape"`
- Modifier combo: `"Control+Z"` or `"Shift+Control+Z"`
- Multiple alternatives: `"Control+Z Control+Shift+Z Alt+Z"`
  - Display: Ctrl+Z or Shift+Ctrl+Z or Alt+Z

### KbdShortcutDisplay

For custom tooltip or help text, use the `KbdShortcutDisplay` component to render shortcuts consistently:

```typescript
<div className="flex gap-2">
  <span>Move:</span>
  <KbdShortcutDisplay shortcuts="ArrowUp ArrowDown" />
</div>
```

This parses the aria-keyshortcuts format and renders styled keyboard keys.

## Design Notes

**Why simple declarations over more flexible logic?**

Global shortcuts are few and relatively stable (undo, delete, movement, escape). A single declarative table centralizes policy, makes testing straightforward, and prevents duplicate listeners or missed edge cases. More complex scenarios not achievable by these definitions are not needed in the scope of this project.

**Why split match and execute?**

Separating the phases allows suppression of browser combos (preventing new-window, save dialogs, etc.) while still gating execution. Modal suppression and editing-target protection emerge cleanly from this structure.

**Why do unspecified modifiers behave like false?**

This keeps matching exact by default. A shortcut definition only matches the combo it names. If multiple modifier variants matter, define multiple shortcuts instead of letting the executor infer intent from the raw event.
