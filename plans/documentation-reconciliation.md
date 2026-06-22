# Plan: Documentation Reconciliation (final stage)

> **Status:** deferred — run as the **final stage**, after the runtime refactors
> (§6.1 selection-effects, §6.2 controller→coordinator migration, §6.3 overlay
> de-threading, and the seam-model/lint changes) have landed and stabilized.
> Branch `editor-surface-keyboard-architecture-refactor`.

## Why this is deferred

This work stream makes many consecutive movements with interim states that
should not be documented (they would be stale within a slice or two). Project
documentation under `docs/`, the per-layer `README.md`s, and the agent contract
were intentionally **not** updated as we went. This stage reconciles all of them
in one pass against the final runtime state, so the docs describe the destination
rather than any intermediate step.

Do **not** start this stage until the runtime work is complete and green.

## What changed that docs must catch up to

- **Selection-effects** promoted out of the App-owned hook into an `editor-state`
  module driven by a startup `scene-state-store` subscription (no React surface).
- **Action coordinators** (history/movement/selection, and later
  deletion/start-over/catalog/share as they convert) live in **`editor-state`**
  as the neutral coordination layer — not in app controllers, not in leaf
  features. App is composition-only.
- **Seam model / boundaries:** cross-cutting coordination + state lives in
  `editor-state`; features depend downward only; **cross-feature imports are
  hard-banned** (`eslint.config.js`). The previous "deep import / public-api
  escape" framing is gone.
- **Overlay/top-header de-threading** (§6.3): feature components self-source via
  stores / command dispatch / `editor-state` coordinators instead of threaded
  `on*` props; catalog-id state and any new store seams (focus-intent,
  environmentConfig) relocated.

## Docs to review and update (where affected or where gaps exist)

1. `docs/architecture-boundaries.md` — encode the strictly-vertical graph, the
   cross-feature ban, and the "coordinators live in editor-state" placement rule;
   reconcile the placement-rules list and the layer-intent for editor-state.
2. `docs/editor-state-architecture.md` — add selection-effects + the action
   coordinator modules to the editor-state responsibilities; document the
   coordination-module convention and the startup-subscription pattern.
3. Per-layer READMEs: `src/app/README.md`, `src/features/README.md`,
   `src/editor-state/README.md`, `src/shared/README.md`, `src/scene/README.md`
   — reconcile ownership/boundary statements (esp. app composition-only,
   editor-state coordinators, no cross-feature).
4. `AGENTS.md` and `.agents/**` (policies/playbooks) — only where the refactor
   made guidance inaccurate (e.g. controller placement, boundary policy). Keep
   concise; link to canonical docs rather than duplicating.
5. Any feature-facing docs touched by behavior or naming changes
   (`docs/keyboard-shortcuts.md`, `docs/editor-workflow-reference.md`, etc.) —
   only if user-facing wording became inaccurate.
6. Retire/curate the working plan docs under `plans/` (handover, the per-phase
   plans, this doc) — fold durable architecture into the canonical docs; the
   plans are not long-term reference.

## Method

- Grep for stale terms after the runtime work settles (e.g. removed controller
  names, "public API/index.ts" cross-feature wording, old placement guidance).
- Treat `docs/architecture-boundaries.md` + `docs/editor-state-architecture.md`
  as canonical; READMEs and AGENTS link to them, not duplicate.
- Validation: `pnpm lint` (markdown/prettier), and confirm no doc describes a
  removed mechanism.
