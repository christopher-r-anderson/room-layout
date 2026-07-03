# Interactivity

How this app expresses "you can act on this" vs "you can't right now" across its
controls. This is the project's own convention layered on top of the platform —
which surfaces are toolbars, how disabled state is expressed, and where the
background is made inert. For the blocking/non-blocking overlay model these rules
build on, read `dialogs-and-overlays.md`.

## Toolbars are roving composites

Grouped controls are real Base UI `Toolbar.Root` composites with roving tabindex:
the group is one Tab stop and arrow keys move between its items.

These surfaces are toolbars:

- the **top header** — one `Toolbar.Root` spanning both rows; each
  `TopHeaderSurface` is a visual cluster, and `HistoryTools` renders a
  `Toolbar.Group` inside it. Roving covers the whole header.
- **camera** controls (`camera-tools.tsx`).
- the **selected-item** actions (`selected-item-tools.tsx`).

These are deliberately **not** toolbars: the **outliner** (a list), the
**selected-details panel** (a form), and **drawer/dialog contents** (e.g. the
More actions drawer — a vertical menu inside a dialog).

A toolbar item is a `Toolbar.Button`. `ToolButton` (`shared/ui/tool-button.tsx`)
is the standard one (icon + tooltip carrying label, shortcut, and disabled
reason); plain header buttons are wrapped as `<Toolbar.Button render={…}>`.

## Disabled state

- **Toolbar controls** use `ToolButton` / `Toolbar.Button` with the `disabled`
  prop. Base UI keeps the item focusable, marks it `aria-disabled`, and
  suppresses activation — so screen-reader and keyboard users still reach a
  disabled action and its tooltip explains why it is off. This focusable-disabled
  behavior is the reason these controls are toolbar items rather than bare
  buttons. `ToolButton` carries no hand-rolled disabled handling.
- **Form controls** — the catalog **Add Item** button uses the native `disabled`
  attribute (nothing selected to add). The catalog radios and selected-details
  inputs carry no disabled handling.
- For a disabled item whose absence is obvious from a neighbour, the escape hatch
  is Base UI's `focusableWhenDisabled={false}` on the underlying `Toolbar.Button`
  (would need forwarding through `ToolButton`); nothing needs it today.

Disabled state only ever encodes an intrinsic capability gap — no history to undo,
no selection to act on, a scene already at defaults, nothing picked to add. It
never encodes "the editor isn't ready yet": startup readiness is a background
concern handled by deferring the chrome and the canvas inert seam (next section),
so no control carries a loading-disabled state.

## Background neutralization

A modal overlay neutralizes the chrome behind it — the modal owns this, the
chrome carries no `inert` of its own.

- **Blocking dialogs/drawers** trap focus, hide the background from the
  accessibility tree, and block its pointer events. Base UI dialogs do this out
  of the box. Vaul drawers (catalog, More actions) must set **`autoFocus`** so
  focus moves into the drawer on open and Radix's focus trap engages — Vaul
  defaults `autoFocus` off, which would leave focus on the trigger and let Tab
  walk the (merely `aria-hidden`) background, including a roving tabstop. With
  `autoFocus` the standard modal mechanism covers everything; no manual `inert`.
- **Non-blocking surfaces** (the Room panel) deliberately leave the chrome live.

During startup the editor chrome is **not mounted at all**: `EditorOverlay` is
code-split and rendered only once the editor is ready (`editor-body.tsx`), so
there is no chrome to neutralize while assets load. What _is_ mounted during
loading is the canvas — it drives the asset load — so it carries the one
hand-rolled `inert` seam in the app, where there is no modal to own it:

```text
<main>
  <section "Interactive 3D room editor" inert={startupOverlayActive}>  ← canvas, the only seam
    <SceneCanvas>
  {editorReady && <EditorOverlay>}     ← TopHeader · CameraTools · Outliner ·
                                          panels · toolbars, mounted only when ready
  <InitializationProgress> / <InitializationError>   ← shell-level loading UI
    dialogs / drawers render in portals
```

`inert` covers pointer events, focus, and the accessibility tree — but not
window-level keyboard listeners. Those are gated separately: `useKeyboardShortcuts`
and `useCameraKeyState` take a readiness-tied `enabled` flag, the one interaction
guard the inert seam cannot replace.
