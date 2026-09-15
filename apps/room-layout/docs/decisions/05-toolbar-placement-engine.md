# The placement engine stays

Status: accepted, 2026-07-12

## Context

The engine that places the floating toolbar works in screen space: it projects
the selected mesh, analyzes the object's outline, and scores candidate positions
around it. It reached that shape through iteration. Placement started as a
projected bounding box, which left large usable positions it couldn't see.
Point-level placement against the object's actual outline was layered on, then a
convex hull to keep those calculations manageable, then hysteresis so the choice
stays stable during camera movement. By the end it was the most complex code in
the feature.

The toolbar-placement decision then made floating the permanent desktop model
with a clamped fallback, which changed the engine's status: it stopped being
optional polish and became the mechanism the desktop experience rests on. Before
building on it, the code got an audit - learn what each part earns, cut what
doesn't, and answer the concrete question of whether a much simpler placement
would do now that the fallback guarantees the toolbar is always present.

## Decision

The engine stays. The simplification candidate - box-based placement, examined
below - fails the two scenes that shaped the engine, so the audit's output
became legibility instead of deletion: the outline analysis and the hysteresis
carry comments saying why they exist, the naming was finished, and the
general-purpose geometry moved into its own module.

The two scenes are also pinned as named unit tests, so the evidence that kept
the engine doubles as the acceptance bar for anyone simplifying it later. And
the engine sits behind one pure function with a stable contract, so a simpler
implementation can be swapped in and judged against those tests at any time.
That question was deliberately left open until the rest of the toolbar work had
shipped, then closed: the cleanup had removed the cost that motivated
simplifying, and a swap would give up proven behavior for nothing structural.

## Alternatives considered

### Box-based placement

The simplification candidate, and where the feature originally started. A long
object viewed diagonally - a couch with the camera rotated - turns a projected
box into mostly empty corners: box placement lands at the screen edge or on top
of the object while the open diagonal pockets sit unused. An object that is wide
in one place and thin in another - a table's flat top over thin legs - has an
outline a box can't represent at all. Those two scenes are why the code grew
past the box in the first place, and re-checking them against a box candidate is
what closed the question.

### An oriented bounding box

The middle ground: keeps the rotation an axis-aligned box loses, but it is still
blind to outline shape - the table case - and the implementation is not clearly
smaller than the hull work it would replace.

## Consequences

- The engine is more code than a floating toolbar strictly needs. That is the
  accepted price of the placement quality, and the reopening cost is kept low on
  purpose: one pure function, the two scene tests as the acceptance bar, and a
  walkthrough in `docs/architecture/selected-toolbar-placement.md`.
- The two scene tests only guarantee the known failures stay fixed. Placement
  quality on everything else is unpinned, so a simpler implementation could pass
  both tests and still place worse elsewhere - judging a replacement still ends
  with looking at real scenes.
- Placement stays one pure function. Anything new it needs to consider - another
  panel to avoid, a different container - has to arrive as an input rather than
  being read from state, which keeps the function testable but means its
  signature grows with the UI.
- The placement geometry runs at frame frequency and stays in its own store,
  separate from the toolbar's UI flags; its perf counters back the e2e idle gate
  that fences frame-time regressions.
