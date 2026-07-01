# Playbook: UI and Accessibility Change

Use when changing visible controls, tab order, labels, dialogs, or announcements.

Checklist:

1. Keep keyboard-first workflows working end-to-end.
2. Preserve deterministic focus return paths for dialog flows.
3. Prefer semantic HTML and visible text before adding ARIA attributes.
4. Use `aria-label` only when visible text or element semantics are not enough.
5. Keep ARIA names in sync with visible labels and tests.
   5a. Route all user-facing strings through Lingui - `<Trans>`/`t` in components,
   `msg` + `i18n._()` in non-React code, `Intl` formatters for numbers/units. No
   hardcoded UI text (lint enforces this). See `docs/architecture/i18n.md`.
6. Keep announcement surfaces centralized; avoid ad hoc live regions unless the
   feature owns a distinct announcement contract.
7. Clear or replace announcement state before re-announcing the same message.
8. Do not hide overlays in tests that verify UI contracts.
9. Prefer keyboard paths in tests when pointer semantics are not the feature.
10. Follow the toolbar, disabled-state, and inert conventions in
    `docs/architecture/interactivity.md` (grouped controls are roving toolbars;
    disabled toolbar items stay focusable; the background has one inert seam).

Validation:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`
- relevant Playwright specs in `e2e/`
- `e2e/editor-a11y-audits.spec.ts` when semantics/focus changed

Common regressions to watch:

- focus loss after close/confirm actions
- tab order drift between desktop/mobile layouts
- stale role/name selectors in browser tests after label changes
- accidental pointer-event interception by overlay wrappers
- redundant ARIA where native semantics would already communicate the meaning
