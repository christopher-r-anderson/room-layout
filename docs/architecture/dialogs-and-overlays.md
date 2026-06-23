# Dialogs and Overlays

Top-level overlays — drawers, confirmations, the room panel — are all driven by
one generic `dialog-store` active-surface model. Dialogs _are_ the primary
overlays, so this is one concept with one home. This doc is the model and its
invariants; for the store API and field shapes, read
`src/core/stores/dialog-store.ts` and `src/core/dialog-contract.ts`.

## The active-surface model

`dialog-store` keeps **at most one** active top-level surface:

- `activeSurface = null`, or
- one surface `{ id, kind, payload }`.

`kind` drives blocking policy — there are no per-dialog boolean flags:

- `blocking` contributes to `useIsBlockingOverlayOpen()`.
- `non-blocking` stays open without asserting blocking-overlay behavior.

The one-active-surface invariant is what gives mutual exclusion for free (below).

## Ownership

Three parties, kept separate so feature definitions stay free of app-shell
imports:

- **`dialog-store` (core)** owns only the generic active-surface state, the
  open/close operations, and the dialog-open selectors.
- **Features** own each dialog's `DialogDefinition` — its `kind`, `canOpen`
  guard, and payload derivation — in the owning feature folder.
- **App** bootstraps: it aggregates the definitions
  (`src/app/dialogs/dialog-registry.ts`) and registers them once
  (`src/app/dialogs/bootstrap-dialog-registry.ts`) before any dialog consumer
  renders.

The feature-facing contract (`DialogId`, `DialogKind`, `DialogOpenRequest`,
`DialogDefinition`, `DialogRuntimeContext`) lives in `core/dialog-contract.ts`,
which features can import without depending on the store.

## Blocking overlays

Blocking overlays suspend editor interaction while open (catalog drawer, delete
and start-over confirmations, keyboard-shortcuts and project-info dialogs, the
mobile More drawer). While one is open:

- scene interaction is disabled;
- preview visibility/clearing follows the blocking state;
- outliner focus handoff is suspended;
- keyboard shortcuts are blocked and held camera-key state is cleared.

Consumers read this as `isBlockingOverlayOpen`, derived from `kind: 'blocking'`.

## Non-blocking overlays

The room surface is the non-blocking case: it stays visible without suspending
interaction. Desktop opens it as a right sidebar; mobile opens a non-modal drawer
(`modal={false}`). The room stays visible, outside-pointer interaction and camera
controls remain available, and keyboard shortcuts keep working subject to the
usual room-view focus rules.

## Mutual exclusion and breakpoint persistence

- **Mutual exclusion.** The room surface is mutually exclusive with every other
  top-level overlay: opening a blocking overlay while the room is open closes the
  room first. This is the one-active-surface invariant, not bespoke logic.
- **Breakpoint persistence.** The room stays open across desktop/mobile layout
  transitions — the sidebar swaps to the mobile sheet and back — and its
  return-focus target stays the Room trigger across the swap.

## Gating

Two layers, in order:

1. **Global gate:** startup readiness, enforced once in the store. This is the
   _only_ store-level global gate.
2. **Feature guard:** the definition's `canOpen(...)` (selection requirements,
   start-over eligibility, etc.).

`dialog-store` reads the external state those guards need through a
`DialogRuntimeContext` that app composition configures — currently dialog
readiness, selected-furniture lookup, and the start-over eligibility seam.

## Focus return

`dialog-store` is **focus-agnostic** — it stores no return-focus token. The
surface that opened a dialog owns restoring focus:

- Blocking dialogs rely on Base UI restoring focus to their opener on close.
- The top header restores focus explicitly through a module-level registry
  (`src/app/chrome/top-header/header-focus-registry.ts`) where native restore is
  unreliable: the non-modal room surface, and the mobile More drawer whose items
  unmount on close.
- Confirming Start Over disables the Start Over button, so the header walks to the
  next enabled control rather than restoring focus to a disabled target.

## Boundaries

`dialog-store` must not write to `scene-document-store` or
`selection-focus-store`,
and must not depend on shell layout context. Cross-store writes belong in
`core/operations` or feature-internal actions. Layout transition state and DOM
focus mapping live in the shell, not the store.
