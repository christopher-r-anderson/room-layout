# Plan: Documentation Information Architecture

> **Status:** ✅ **shipped** (all three steps). The doc surface is tiered into
> `docs/{architecture,guide,reference}`, `core-architecture.md` is split into
> `core.md` + `scene-and-core.md` + `dialogs-and-overlays.md` (the latter folding
> in `overlay-interaction-model.md`), and catalog validation is de-duplicated.
> Each concept now has one canonical home at one altitude. Branch
> `editor-surface-keyboard-architecture-refactor`.

## Why now

The code has settled (the de-threading + `core` rename shipped); the docs lagged
because they were written ad hoc — dialogs went deep first, everything since is
stubs or duplicates. The mis-framings we hit (the "mirror" seam, "boundaries",
the buried scene/core decision) are symptoms of missing information architecture,
not isolated wording bugs. The fundamentals being mis-documented are exactly the
ones that **won't** move in the upcoming audits, so this pass is durable.

## Principles

1. **One concept, one home.** Each concept has a single canonical doc. Every
   other doc links to it; none re-explains it.
2. **Altitude = durable structure + invariants + rationale.** Prose describes the
   shape, the invariants, and the _why_. Exact specifics (method lists, field
   tables, key combos) live in code, types, tests, or schema — which can't drift —
   and the doc points there. If a section would break when a signature changes,
   it's at the wrong altitude.
3. **Organize by audience, then concept.** Three reader tiers, kept separate:
   end-user, contributor/architecture, and AI-agent. Layer `README`s stay thin
   local pointers.

## Current-state findings (grounded in the inventory)

**Duplication (same concept in N places):**

- **Dialogs/overlays — the worst offender.** `core-architecture.md` spends ~100
  of its 251 lines on dialog orchestration (8 subsections) **and** repeats a
  "How to Use Dialog Store" how-to after the scene/data-flow sections.
  `overlay-interaction-model.md` (99 lines) re-covers blocking/non-blocking,
  mutual exclusion, and focus return. `editor-workflow-reference.md` has a
  "Dialog and Overlay Contracts" section too. Three docs, one concept.
- **Keyboard.** `keyboard-shortcuts.md` (172 lines) is keyboard _architecture_
  (input systems, shortcut model, held-key model) — but its name implies the
  user shortcut list, which actually lives in `editor-shortcuts-reference.md`.
  Naming inversion + overlap with the `user-guide` shortcuts section.
- **Catalog/manifest.** `catalog-and-assets.md` ("Manifest Validation Rules")
  overlaps `catalog-manifest-schema.md` ("Validation Rules", 234 lines).

**Gaps (under-documented):**

- **The scene⇄core data-model/engine seam** — the single most load-bearing and
  least-understood decision — is buried in `core-architecture.md`'s 22-line
  "Scene Ownership" + "Data Flow" sections, sandwiched between dialog material.
- **Store inventory** — `core-architecture.md`'s "Other Editor-State Stores"
  (legacy term) is a stub bullet list; the stores deserve a real inventory.
- **Operations** — thin, recently added.

**Over-detail (drift-prone):**

- The dialog how-to in `core-architecture.md` enumerates the store API in prose.
- `catalog-manifest-schema.md` (234 lines) field-by-field — justified _if_ framed
  as exact reference pointing at the validator, not as standalone prose.

**Mislocation / misnaming:**

- `architecture-boundaries.md` is really the architecture **overview** (map +
  rules), not just "boundaries."
- `core-architecture.md` is a grab-bag (core layer + dialogs + scene seam + a
  dialog how-to) with broken ordering ("back to dialogs again" after data flow).
- `keyboard-shortcuts.md` vs `editor-shortcuts-reference.md` — names inverted.
- "Other Editor-State Stores" — legacy `editor-state` term.

## Target information architecture

### Tier 1 — Architecture / contributor docs (the focus of this pass)

| Doc                             | Owns (single concept)                                                                                                                    | Altitude                            | Action                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `architecture.md`               | layer map, dependency rules, placement rules, ESLint contract                                                                            | structure + rules                   | **rename** from `architecture-boundaries.md`                                                                                         |
| `core.md`                       | the `core` layer: real store inventory, operations, commands vocabulary, persistence                                                     | responsibilities, not API           | **reframe** `core-architecture.md`, minus dialogs and scene-seam                                                                     |
| `scene-and-core.md`             | the data-model/engine seam: data in core, rules+rendering in scene, commands-down / contract-up, the published `scene-contracts` surface | fundamental model + invariants      | **new** — promote the buried "Scene Ownership"/"Data Flow" out of `core-architecture.md`; this is where the "mirror" reframing lives |
| `dialogs-and-overlays.md`       | dialog/overlay model: registry, active-surface invariant, blocking semantics, focus-return ownership                                     | model + invariants                  | **merge** `core-architecture.md` dialog sections + `overlay-interaction-model.md`; drop the API how-to (point to code)               |
| `keyboard.md`                   | keyboard _system_ architecture (input systems, shortcut model, held-key model)                                                           | subsystem model                     | **rename** from `keyboard-shortcuts.md`; clarify it is architecture, not the list                                                    |
| `selected-toolbar-placement.md` | toolbar bounds + placement algorithm                                                                                                     | feature algorithm                   | keep                                                                                                                                 |
| `catalog-manifest-schema.md`    | the manifest schema (exact reference)                                                                                                    | reference → points at the validator | keep; absorb the validation-rule dup                                                                                                 |
| `catalog-and-assets.md`         | asset pipeline, locations, startup contract                                                                                              | overview                            | keep; drop validation dup → link to schema                                                                                           |
| `testing.md`                    | test lanes + guidance                                                                                                                    | process                             | keep                                                                                                                                 |
| `ui-components.md`              | shadcn/ui ownership policy                                                                                                               | policy                              | keep                                                                                                                                 |
| `editor-workflow-reference.md`  | verification/behavior catalog (QA flows)                                                                                                 | reference                           | keep; its dialog/overlay/keyboard items **link out** instead of restating                                                            |

### Tier 2 — End-user / reference docs

| Doc                             | Owns                                | Action                                                                               |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| `user-guide.md`                 | end-user how-to                     | keep                                                                                 |
| `editor-shortcuts-reference.md` | the actual shortcut list            | keep (optionally rename `shortcuts-reference.md` to pair clearly with `keyboard.md`) |
| `url-scene-sharing.md`          | the sharing feature + payload shape | keep; point to `scene-url` for exact payload                                         |
| `assets-attribution.md`         | licenses / attribution              | keep (standalone)                                                                    |

### Tier 3 — Agent docs & layer READMEs (mostly unchanged)

- `AGENTS.md` + `.agents/policies/*` + `.agents/playbooks/*` already link to human
  docs instead of duplicating (per `docs-sync.md`). Action: **re-point links** to
  the renamed/split docs; no content rewrites.
- `src/*/README.md` stay thin "what lives here" pointers. Action: re-point the
  "See also" links; `src/core/README.md` already carries the new layout.
- Root `README.md` "Documentation" section is the index of indexes — **update it**
  to the new structure (it's how readers discover all of the above).

## Concept → canonical home (the de-dup map)

- Dialog/overlay behavior → `dialogs-and-overlays.md` (remove from `core.md`;
  retire `overlay-interaction-model.md`; `editor-workflow-reference.md` links).
- Scene⇄core data ownership → `scene-and-core.md` (remove from `core.md`).
- Store inventory + operations → `core.md` (expand the stub).
- Manifest validation → `catalog-manifest-schema.md` (`catalog-and-assets.md`
  links).
- Keyboard model → `keyboard.md`; the shortcut list → `editor-shortcuts-reference.md`.

## Decisions (confirmed)

- **D1 — Tiered subfolders.** `docs/{architecture,guide,reference}/`. Audience
  tiers visible from the tree; accept the link-repointing churn.
- **D2 — One `dialogs-and-overlays.md`.** Merge the dialog-store material and
  `overlay-interaction-model.md` into a single doc.
- **D3 — Architecture tier first.** Land Tier 1 now; user/reference/agent
  touch-ups follow.
- **D4 — Rename for clarity.** `keyboard.md` (architecture) paired with
  `reference/editor-shortcuts-reference.md` (the list).

## Folder map (target)

```
docs/
  architecture/
    architecture.md                 (← architecture-boundaries.md)
    core.md                         (← core-architecture.md, reframed)
    scene-and-core.md               (new)
    dialogs-and-overlays.md         (← core-architecture dialogs + overlay-interaction-model.md)
    keyboard.md                     (← keyboard-shortcuts.md)
    selected-toolbar-placement.md
    catalog-and-assets.md
    editor-workflow-reference.md
    testing.md
    ui-components.md
  guide/
    user-guide.md
    url-scene-sharing.md
  reference/
    editor-shortcuts-reference.md
    catalog-manifest-schema.md
    assets-attribution.md
```

Tier rule of thumb: **guide/** = narrative how-to for end users; **reference/** =
exact lookup tables (shortcut list, manifest schema, licenses); **architecture/**
= how-it-works for contributors. Borderline calls to confirm at execution:

- `editor-workflow-reference.md` → architecture (contributor verification flows,
  not a lookup table) despite the "reference" name.
- `catalog-and-assets.md` → architecture (it documents the texture pipeline /
  basis-decoder / startup contract, i.e. contributor mechanics), while the pure
  data schema stays in reference.
- `url-scene-sharing.md` → guide (user-facing feature), pointing at `scene-url`
  for the exact payload.

## Execution order

1. **Establish the folders (mechanical, all docs):** create the three subfolders,
   `git mv` every doc to its tier, and repoint all links (root `README.md` index,
   `AGENTS.md`, `.agents/*`, layer `README.md`s). One reviewable move commit.
2. **Architecture-tier content (the meat):** split `core-architecture.md` →
   `core.md` + `scene-and-core.md` + `dialogs-and-overlays.md` (folding in
   `overlay-interaction-model.md`); rename `architecture-boundaries.md` →
   `architecture.md`; write `scene-and-core.md` and the store inventory at the
   right altitude; keyboard rename.
3. **Fast follow (separate):** guide/reference content polish, catalog validation
   de-dup, agent-link verification.

**Deferrals:** `command-dispatch-context` placement + the zustand-vs-context audit
outcomes get one-line "under review" notes, not sections.
