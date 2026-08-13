# Core owns the engine ports; the scene renders a projection

Status: accepted, 2026-07-06

## Context

The scene-services registry - the lookup everything uses to reach the 3D
engine - lived in the scene layer itself rather than in core, so everything
routed through the scene, including core changing data that core owned. That
placement was leftover from prototyping, where features attached to the
component doing the rendering, and it left the scene in charge of logic that
had nothing to do with rendering: twelve document mutations across furniture
placement, history, and selection, all running on rules that were already pure
functions in the domain layer, applied to a document store that was already
what the scene rendered from.

That misplacement kept generating work. Selection state was written on both
sides of the boundary through a `selectedSource` field, async reconcilers synced
state across it after the fact, some stores existed only to mirror the other
side, and the ESLint config needed hand-maintained exception lists to allow the
circular imports. Each new feature was more of the same.

By this point the app had already been through a round of organizing that pulled
state out of the component tree and made the pieces and their relationships
visible. This decision was the step that gave the working app a deliberate
architecture, and pre-1.0, with no external consumers, the disruption of a large
restructure was acceptable.

## Decision

Invert the relationship: core owns the engine ports and the scene implements
them. Three moves carried it.

- The port surface moved into core: the `SceneServices` interface, its registry,
  and the `sceneCommands` facade that features and operations call. The scene
  registers its implementations when it mounts.
- The twelve document mutations moved into core, which shrank `sceneCommands` to
  services that are genuinely about the viewport: camera control, screen-space
  snapshots, and loading a collection's models into the scene.
- Selection state collapsed into one session store, making the split explicit
  between document state (what the share URL and the draft serialize, and what
  undo operates on) and session state (what doesn't carry through reloads or
  shares, like the current selection).

The layer rules are ESLint rules with no exception list: core and features can't
import the scene, and app holds the single lazy mount that puts it on screen.
Breaking a rule fails lint, and the rule messages state the policy.

The work shipped as five staged PRs - the ports, the mutations, the selection
store, a cleanup stage that moved the model into domain and dissolved the
catch-all type modules, and rewriting the architecture docs against the result -
each leaving the app shippable. A review pass over the whole followed, since
some things only show when the change is viewed as a cohesive whole rather than
one stage at a time.

Two related pieces were questioned and kept as they were. Drags keep writing to
the document as the pointer moves, with the whole drag recorded as one history
change; a preview ghost that only commits on release would be its own decision.
And the asset loading pipeline keeps its download and progress code free of
three.js imports, so the loading UI never waits on the engine chunk.

The resulting shape matches ports and adapters as hexagonal architecture
describes them: core defines the interfaces and stays pure logic, the renderer
plugs into them, and the dependency arrows all point at core. tldraw's editor
splits its state along the same document/session lines. The decision came from
what the code showed - the mutations never touched the renderer - and matching
established patterns was a gut check on the direction.

## Alternatives considered

### Keep the shape and patch the symptoms

Every symptom already had a workaround - the reconcilers, the mirror stores, the
exception lists - and each new feature added more of them. Rejected because the
workarounds were the maintenance cost, and all of them traced back to the same
misplaced dependency.

### Scene keeps the document

Formalize what existed instead: let the scene own the mutations and have core
subscribe to the results. Rejected on the evidence above - the mutation logic
ran on pure domain rules and never touched an `Object3D`, so placing it in the
rendering layer preserves a dependency that doesn't exist in the logic.

### Rebuild from scratch on the intended architecture

Reimplement the editor with the boundaries right from the first commit. The
staged migration kept the app shippable and every step reviewable, and it let
the boundaries be drawn against real friction in a working app instead of in a
vacuum.

## Consequences

- The doubled selection writes, the reconcilers, the mirror stores, and the lint
  exception lists are all gone. Each one existed to work around the circular
  dependency, and none needed a separate fix once it was removed.
- The layer rules stay true as the code changes, because breaking one fails lint
  rather than waiting for a review to catch it.
- Rendering sits behind interfaces core owns, so the scene is replaceable in
  principle and loads as its own code-split chunk.
- A new behavior that needs the viewport means extending the port surface
  deliberately; nothing reaches into the scene directly.
- This was a large amount of change in a short window, and the staged migration
  left temporary code that took a dedicated later pass to remove.
