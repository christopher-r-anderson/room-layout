# Focus decisions happen at the moment of change

Status: accepted, 2026-07-11

## Context

Keyboard-first operation is a product requirement, so the destination of focus
after each action - adding an item, deleting the control being used, undoing a
change, closing a drawer - needs to be deliberate. Focus moves between the
editor's surfaces - the scene, the item list (the outliner), the details panel,
the toolbars - and there was no unified approach to those moves. Components
focused other components' DOM directly through refs handed around from a central
registry, which coupled surfaces together and left each call site to handle
staleness on its own. The registry itself had to be kept in sync by hand, and
sync failures were silent: a browser fires no blur when a focused element is
removed. Alongside the refs, four separate stored-request mechanisms had
accumulated (`outlinerFocusRequest`, `roomViewFocusRequest`, `returnFocusTo`,
`pendingDeleteFocusTarget`), each queueing focus work for some other surface to
pick up later, and because queued requests could go stale, a reconciler existed
just to clean up after them.

The bugs this produced were patched with one-off decisions at each problem site.
What finally forced a structural approach was the form-factor-specific UI: an
action like undo has no concept of which layout is showing, and there was no
longer any single destination guaranteed to exist. On mobile, delete and undo
queued requests for the outliner - a panel that only exists in the desktop
layout - and a request with no consumer could sit stale and grab focus later.
Similarly, the selection store's `selectedSource` field recorded where a
selection came from so it could be used later during focus repair, but by then
it could be stale.

## Decision

Each focus-affecting action breaks into three pieces:

- the origin: the gesture facts - the surface the person was working in and the
  input method - recorded when the gesture happens;
- an Intent: the question - "focus what now matters", "focus the surface the
  user asked for";
- a Directive: the answer - the decided destination, naming exactly one surface.

Resolving happens the moment the action takes effect: one pure policy function
takes the Intent and the origin, reads the updated app state - what a viable
selection now is, and which surfaces exist in the current layout - and produces
the Directive. A Directive can only ever name a surface the current layout
actually has, which is the property the mobile bug's dangling requests lacked.
For a pane shortcut or a selection that's immediate; delete changes nothing
until its dialog confirms, so the decision waits with it. The focus system
itself holds nothing until the change - anything an in-progress flow needs
later, like the delete dialog's recorded origin, stays in that flow - and the
completed Intent is asked and answered in one call. An action's code only ever
states an Intent, never a destination, which keeps the policy in one function
instead of spread across every call site.

A Directive can't always be applied synchronously, because its target may not
exist in the DOM yet: undo restores an item, and the row to focus appears only
when React renders the post-change UI. So the Directive waits in one app-wide
slot (`pendingFocus`), usually for a frame or two, under guards. A guard only
keeps or clears rather than trying to pick a new destination:

- a newer resolution replaces it, and a "don't move" decision clears it;
- a blocking overlay opening clears it - the dialog owns focus now;
- a layout change clears it if its surface no longer exists. It never attempts
  to remap to a corresponding surface when a responsive change causes its
  removal - the UIs are purposefully distinct and a one-to-one mapping is
  neither assumed nor expected;
- resetting the app clears the whole focus store;
- the surface applying it confirms it's still the pending Directive in the same
  frame.

The surface named by the Directive applies it by focusing its appropriate
descendant element itself - the outliner walks to the nearest remaining row, a
panel takes its first control. No component focuses another component's DOM, and
there are no focus refs. The levels are separate on purpose: the action states
the Intent, the policy picks the surface, the surface picks the element. "Focus
the selected item" is ambiguous on its own - an item shows in both the outliner
and the scene - and the origin settles which.

What the policy encodes came out of a research pass (WAI-ARIA APG guidance, plus
how Figma and VS Code behave):

- Undo and redo never move focus across surfaces. Keyboard undo reveals the
  restored change within the surface the person is working in, scene-focused
  undo stays in the scene, and focus resting on a control like the undo button
  itself is never stolen from - repeated undo stays right there.
- Pointer interaction never moves focus, with one exception: when the action
  destroyed the control that had focus, focus is repaired instead of falling to
  the page body.
- Repairs return focus to the surface the person was working in; on mobile they
  land on the scene, the surface that always exists.
- Feedback never depends on focus. Operations announce their results through the
  live region whether or not focus moves, and the focus system separately
  announces when a focus command can't do what was asked. For example, when
  pressed on mobile, the shortcut that jumps to the item list announces that the
  list isn't available rather than doing nothing.

The full policy table lives in `focus-policy.test.ts`, so the specification runs
as tests, and `docs/architecture/focus.md` covers the pipeline in engineering
detail.

The delete flow, end to end:

1. The delete button opens the confirm dialog; the opener records which surface
   the gesture came from.
2. The dialog captures focus, like every dialog, and will restore toward its
   trigger on close.
3. Confirming deletes the item, and the decision happens right then: a scene
   origin repairs to the scene; otherwise the outliner on desktop, the scene on
   mobile.
4. The dialog's restore aims at a trigger that may no longer exist; the scene
   repair applies one frame later on purpose, so focus ends somewhere useful
   instead of on the page body.

Dialogs otherwise keep their own focus mechanics; this system takes over only
when a dialog's action changed the world.

## Alternatives considered

### Keep the ref registry

Keep the editor-level ref registry and fix the bugs case by case. Every fix
would be another one-off decision at a problem site, the policy stays untestable
without mounting everything, and the node list still has to be kept in sync by
hand. The refs were deleted instead; the one legitimate need they served -
measuring scene geometry for toolbar placement - moved to a registry that
measures elements instead of holding them.

### A focus director component

One component that watches state and moves focus into the others. Ordering and
races move into React effect timing, and the policy can only be tested by
mounting components and simulating - instead of as a function with inputs and
outputs.

### Decide at the gesture

Resolve the destination the moment the person acts. Anything with a gap then
decides about a world that doesn't exist yet: at the delete button, the item is
still there, the selection hasn't moved, and the layout can change before the
confirmation does. The old queued requests were this in practice, and their
staleness is what this decision removes.

## Consequences

- The guards are a hand-maintained list. Opening a blocking overlay, a layout
  change, and the app reset are the world changes that clear or re-check a
  pending Directive today; any new kind of session-wide change has to join that
  list, and only a documented rule enforces it. This is the standing maintenance
  cost.
- Applying a Directive is a convention. A surface that never applies its
  Directive just doesn't get focused, and nothing errors.
- Knowing which surface currently holds focus (the fallback that fills the
  origin when a gesture site can't name it) depends on focus and blur handlers
  each surface registers, and those handlers have to keep referentially stable
  identities across renders; the hooks memoize what they return, and a test pins
  the identity.
