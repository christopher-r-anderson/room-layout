# Plan: De-thread Top Header & Remaining Overlay Props (Handover §6.3)

> **Status:** linchpin fork resolved; ready to implement in slices. Branch
> `editor-surface-keyboard-architecture-refactor`.
> **Prereq context:** §6.1 done (selection-effects module), §6.2 Tier 1 done and
> re-homed to `editor-state` (history/movement/selection coordination modules),
> cross-feature imports hard-banned.
> **Seam model (decided):** cross-cutting coordinators live in `editor-state`;
> features import them from there (never from sibling features); app keeps only
> composition-context concerns. So a feature de-threading a callback either reads
> a store, dispatches a command, or imports an `editor-state` coordinator.

## The threading surface (mapped)

`EditorOverlayProps` (`src/app/chrome/editor-overlay.tsx`) threads three bundles
down to leaves. Leaf consumers and current sources:

| Prop                        | Leaf consumer                                         | Layer      | Current source                            |
| --------------------------- | ----------------------------------------------------- | ---------- | ----------------------------------------- |
| `onSelectById`              | `features/scene-panel/outliner.tsx:198`               | feature    | `selectById` module (already!)            |
| `onPreviewChange`           | `outliner.tsx` (focus/blur/enter/leave)               | feature    | `usePreviewController` (hook, hysteresis) |
| `catalog`                   | `features/catalog/catalog-drawer.tsx`                 | feature    | startup state                             |
| `catalogIdToAdd`            | `catalog-drawer.tsx`                                  | feature    | App `useState`                            |
| `onCatalogIdToAddChange`    | `catalog-drawer.tsx`                                  | feature    | App `setCatalogIdToAdd`                   |
| `onAddFurniture`            | `catalog-drawer.tsx`                                  | feature    | catalog controller                        |
| `onCatalogDrawerOpenChange` | `catalog-drawer.tsx`                                  | feature    | catalog controller                        |
| `environmentConfig`         | `top-header.tsx` (finish options)                     | app-chrome | startup state                             |
| `onShareSceneUrl`           | `top-header/share-scene-button.tsx`                   | app-chrome | share controller (Promise result)         |
| `onOpenStartOverDialog`     | `top-header/start-over-button.tsx`                    | app-chrome | start-over controller                     |
| `startOverDisabled`         | `start-over-button.tsx`                               | app-chrome | App `sceneIsAtDefaults` (env-derived)     |
| `onConfirmStartOver`        | `features/startup/start-over-confirmation-dialog.tsx` | feature    | start-over controller                     |
| `onConfirmDeleteSelection`  | `features/selection/delete-confirmation-dialog.tsx`   | feature    | deletion controller                       |
| `onRetryAssetLoading`       | `features/startup/initialization-error.tsx`           | feature    | asset-lifecycle controller                |

The outliner **already reads its other state directly from stores**; only these
two callbacks are threaded. The selected-item sites, camera-tools, and
history-tools **already dispatch via `useCommandDispatch()`** — established
precedent for buttons mapping to existing `EditorCommand` kinds (`start-over`,
`undo`, etc.).

## Linchpin fork — RESOLVED

Decision: **cross-cutting coordinators live in `editor-state`; ban all
cross-feature imports** (F-A). The deep-import-with-`index.ts`-escape option
(F-B) was rejected in favour of a strictly-vertical dependency graph (app →
features → editor-state → scene/shared). The selection/movement/history
coordinators have been re-homed to `editor-state`, and `eslint.config.js` now
hard-bans any `@/features/*` import from within a feature.

Consequence for §6.3: a feature de-threads a callback by (a) reading a store,
(b) dispatching an existing `EditorCommand`, or (c) importing an `editor-state`
coordinator — never by importing a sibling feature. E.g. the outliner's
`onSelectById` becomes `import { selectById } from '@/editor-state/selection-actions'`.

## Other forks

- **Preview split.** `onPreviewChange` (outliner/scene/canvas) routes through the
  preview hook's hysteresis (timer + source ref). To de-thread the outliner,
  either (P-A) split preview like selection-effects — module cells + functions +
  a thin effect hook — so the outliner imports the preview action; or (P-B) leave
  preview threaded for now (handover lists it as "stays a hook"). P-A fully
  de-threads; P-B defers.
- **Catalog state home.** `catalogIdToAdd` is App `useState`. Move into the
  catalog feature (feature-local state/context or a small catalog store) so the
  drawer self-sources and the catalog controller becomes a module. Needed to
  de-thread the whole catalog bundle.
- **`environmentConfig` / `startOverDisabled`.** Both derive from startup
  `environmentConfig`, not in a store. De-threading the finish options + the
  start-over disabled flag needs an environmentConfig store seam (or they stay
  threaded). Shared with §6.2 Tier-2 start-over.
- **share / delete-confirm / retry.** share returns a Promise (stays a callback
  per handover); delete-confirm needs the deletion module (post-delete
  focus-intent seam); retry needs the asset-lifecycle module.

## Suggested slice order (after forks settle)

1. **start-over button → command dispatch** (`start-over` command exists; F-C).
   Removes `onOpenStartOverDialog`. `startOverDisabled` handled via env seam or
   left until the env-store slice.
2. **outliner `onSelectById`** → import `selectById` from `@/editor-state/selection-actions`.
3. **preview split (P-A)** → outliner `onPreviewChange` self-sourced; then scene
   and canvas-keyboard preview too.
4. **catalog state relocation** → de-thread the catalog bundle + convert the
   catalog controller to a module.
5. **environmentConfig store seam** → finish options + `startOverDisabled` +
   unblock start-over controller.
6. **delete-confirm + retry** → via deletion/asset-lifecycle modules
   (focus-intent + startup seams).
7. **Documentation reconciliation** (final stage) — see
   `plans/documentation-reconciliation.md`; run after the runtime work is green.

Each slice: full validation gate + the a11y/hotkeys e2e flows.

## Risk

Mostly focus/keyboard behavior (top-header tab order, dialog focus return,
outliner preview hysteresis) — e2e-guarded. The home fork is reversible but
touches placement broadly, so settle it before slice 2.
