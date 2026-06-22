# Plan: De-thread Top Header & Remaining Overlay Props (Handover §6.3)

> **Status:** proposed — forks to settle before implementing. Branch
> `editor-surface-keyboard-architecture-refactor`.
> **Prereq context:** §6.1 done (selection-effects module), §6.2 Tier 1 done
> (history/movement/selection action modules).

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

## Linchpin fork — where cross-feature-consumed action modules live

`eslint.config.js:221` forbids feature→feature **deep** imports
(`@/features/<other>/<path>`); they must go through a feature **public API**
(`@/features/<other>` → an `index.ts`). This blocks the obvious de-thread of
`onSelectById` (outliner is `scene-panel`; `selectById` is in
`features/selection`). It also means several §6.3 de-threads need a decision on
where the shared action lives. (App-layer consumers like the canvas-keyboard
controller are unaffected — `src/app` may deep-import features.)

**Options (apply consistently):**

- **F-A — move cross-feature-consumed actions to `editor-state`.** selection/
  movement actions are scene + selection-meta + selection-effects + announcement
  coordination — arguably neutral coordination that belongs in `editor-state`,
  which any feature may import. Clean imports, no new public-API surface. Cost:
  re-homes Slice A3's `features/selection/selection-actions.ts` (and movement)
  into `editor-state`; blurs "feature owns its action" slightly.
- **F-B — add feature public APIs (`features/selection/index.ts`).** Keep actions
  in their owning feature; expose the cross-feature-needed ones via `index.ts`;
  consumers import `@/features/selection`. Preserves feature ownership; matches
  the eslint message's intent ("go through a feature public API"). Cost: new
  index modules + knip wiring; the `^@/features/[^/]+/.+` rule message says it is
  "currently a warning while auditing" — confirm severity first.
- **F-C — command dispatch where a command already exists.** For buttons whose
  action is already an `EditorCommand` (`start-over`), dispatch instead of
  importing (no cross-feature import at all). Does not cover `onSelectById`
  (returns `SelectByIdResult`, not a command) or preview.

Recommendation: **F-C wherever a command exists** (start-over button), **F-A for
selection/movement** (they are coordination-shaped and already depend only on
editor-state + scene), revisiting F-B only if we want strict feature ownership.

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
2. **outliner `onSelectById`** via the chosen home (F-A/F-B).
3. **preview split (P-A)** → outliner `onPreviewChange` self-sourced; then scene
   and canvas-keyboard preview too.
4. **catalog state relocation** → de-thread the catalog bundle + convert the
   catalog controller to a module.
5. **environmentConfig store seam** → finish options + `startOverDisabled` +
   unblock start-over controller.
6. **delete-confirm + retry** → via deletion/asset-lifecycle modules
   (focus-intent + startup seams).

Each slice: full validation gate + the a11y/hotkeys e2e flows.

## Risk

Mostly focus/keyboard behavior (top-header tab order, dialog focus return,
outliner preview hysteresis) — e2e-guarded. The home fork is reversible but
touches placement broadly, so settle it before slice 2.
