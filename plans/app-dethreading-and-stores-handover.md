# Handover: App De-threading & Editor-State Store Migration

> **Status:** active work stream, pre-1.0, on branch
> `editor-surface-keyboard-architecture-refactor`.
> **Audience:** an agent taking over with zero prior context.
> **What this is:** the _why_, the _history_, and the _remaining targets_ with
> enough codebase context to start an implementation plan for the next phase
> without re-deriving what matters. This doc is **not** an implementation plan —
> it deliberately stops short of prescribing exact edits so the implementing
> agent retains decision latitude in the nitty-gritty.

---

## 1. Motivation (why this work exists)

`src/app/App.tsx` had grown into a "god component": it owned editor state,
assembled every action handler, and threaded ~18+ named `on*` callbacks down
through intermediate components (`EditorBody` → `EditorOverlay` →
`TopHeader`/`Outliner`/selected-item sites) that mostly didn't use the values
themselves — classic prop-drilling. The keyboard layer compounded this with a
hand-maintained `getShortcutExecutor` switch mapping ~30 shortcut ids onto those
same callbacks.

The pain this caused:

- Adding or moving a feature meant editing App, an intermediate shell prop
  shape, and the leaf — a multi-file change for a single behavior.
- Action logic lived far from the feature that owned it.
- The key→action mapping was duplicated across the shortcut definitions and the
  executor switch.

This is a **pre-1.0 prototype→production hardening effort**. The bias is toward
the _best end-state architecture_, not the quickest patch. Bigger refactors are
acceptable when right-sized into independently shippable, separately committed
slices (the work so far is ~18 small commits, each green).

## 2. Goals (the target end-state)

1. **De-thread the editor surface.** Feature components should get what they
   need by reading a store or dispatching a command — not by receiving callbacks
   threaded through shells that don't use them.
2. **Keep strong TypeScript enforcement.** De-prop-drilling must not weaken
   compile-time guarantees. The chosen mechanisms thread the _type_ everywhere
   while routing the _value_ through context/stores.
3. **Single-source the key→command mapping.** One definition drives both the
   keyboard dispatch and any overlay button for the same action.
4. **Localize ownership.** Action-shaped logic lives in the feature (or a neutral
   action module) that owns it; App becomes a thin composition root.
5. **No command palette / remapping on the roadmap** — so a global, open command
   _registry_ is explicitly _not_ a goal. The command model is closed and typed.

Non-goals: a runtime command registry, remappable keybindings, or store-ifying
state that is genuinely component-local (see §6 "what NOT to chase").

---

## 3. Architecture primer (the playing field)

### Layers and the boundary rules (enforced by `eslint.config.js`)

- **`src/scene/`** — the 3D scene domain. Owns all furniture mutation rules.
  Exposes a narrow imperative facade `sceneCommands` (`@/scene/scene-commands`)
  and types. `src/scene/internal/**` is private to the scene runtime.
- **`src/editor-state/`** — the **neutral coordination layer**. Both `app` and
  `features` may import it. Holds the cross-cutting stores and the typed
  contracts. It must **not** import `@/app/**`, `@/features/**`, or
  `@/shared/ui`. It _may_ import `@/scene/**`.
- **`src/features/`** — feature modules (selection, catalog, keyboard, camera,
  history, room-surface, scene-panel, startup, url-scene, project-info). May
  import `editor-state` and a small scene allowlist
  (`scene-commands`, `scene.types`, `objects/furniture.types`,
  `objects/furniture-catalog`). May **not** import `@/app/**`.
- **`src/app/`** — composition root + app-only orchestration (controllers,
  chrome shell, dialog bootstrap). May import everything.
- **`src/shared/`** — leaf utilities/UI. `shared/providers` is **blocked from
  importing `editor-state`** (this is why the command-dispatch context lives in
  `editor-state`, not `shared/providers`, even though the editor-refs context
  does live in `shared/providers`). `shared/messages` may **not** import scene/
  app/feature/editor-state — so message formatters that need a scene-derived
  reason type re-declare a local literal union instead.

Canonical boundary docs: `docs/architecture-boundaries.md` and
`docs/editor-state-architecture.md`. `AGENTS.md` routes to per-area policy
files under `.agents/`.

### The two de-threading mechanisms already in place

**(a) Stores (Zustand vanilla).** Convention: `createStore` +
`subscribeWithSelector`, a module-level **actions object** (e.g.
`sceneStateActions`, `dialogActions`, `announcementActions`,
`selectionMetaActions`, `editorRuntimeActions`), and **selector hooks** (e.g.
`useSelectedFurniture`, `useItems`). The vanilla store is also exported
(`sceneStateStore`, `editorRuntimeStore`) so **non-React code can read it
synchronously** via `.getState()` and subscribe via `.subscribe(...)`. This is
the key affordance: action modules don't need to be React hooks.

Current stores in `src/editor-state/`:

- `scene-state-store` — app-facing mirror of items/selection/finish ids/history
  availability/editor message/drag flag. (Scene mutation still lives in `scene`;
  this is the read-model + selection id the app coordinates on.)
- `editor-runtime-store` — startup phase, asset error, loading flags. Derived
  `editorInteractionsEnabled = startupPhase === 'ready'`.
- `dialog-store` — generic registry-driven dialog surface (see §4 dialog reorg).
- `selection-meta-store` — selection _source_ (`panel-keyboard`/`canvas-*`) and
  outliner focus requests (focus-intent, not inferred).
- `announcement-store` — polite/assertive SR announcements + movement-announce
  debounce; module-level timers preserve the empty-then-set re-announce dance.

**(b) Typed command dispatch.** `src/editor-state/editor-command.ts` defines a
closed `EditorCommand` discriminated union (~15 kinds: undo, redo, start-over,
focus-inspector/room-view/outliner/selected, open-delete-dialog, clear-selection,
canvas-select-previewed; param kinds `move-selection{delta}`,
`rotate-selection{direction}`, `set-camera-preset{preset}`,
`canvas-browse{direction}`), an `EditorCommandApi` interface (the action side),
and a **pure `runEditorCommand(command, api)`** switch. Dispatch is delivered
through a **ref-backed React context** (`command-dispatch-context.ts` +
`command-dispatch-provider.tsx`): App rebuilds the real `EditorCommandApi` each
render and writes it to a ref in a layout effect; the provider hands out a
**stable** `dispatch(command)` (empty-dep `useCallback` reading the ref). The
stability lets the keyboard hook keep a bind-once window listener and keeps
overlay buttons from re-rendering when the api object is rebuilt.

Gating vs action separation: the keyboard hook
(`features/keyboard/use-keyboard-shortcuts.ts`) keeps the **gating** inputs
(`enabled`, `hasSelection`, `isBlockingOverlayOpen`, `canStartOver`,
`roomViewHasFocus`) — they decide _whether_ a key fires — and dispatches the
**action** via the command api. The key→command mapping is a `command` field on
each shortcut definition (single source of truth).

### The composition shape today

- **`src/app/App.tsx`** (~507 lines) — outer composition root. Reads stores,
  runs startup, instantiates the controllers, assembles `handlers` and the
  `EditorCommandApi`, and renders the provider stack:
  `TooltipProvider → EditorRefsProvider → CommandDispatchProvider → EditorShell
→ EditorBody`.
- **`src/app/chrome/editor-body.tsx`** (~211 lines) — inner surface. Reads
  stores directly (`useEditorInteractionsEnabled`, `useSelectedFurniture`,
  announcements, etc.), hosts the `Canvas`/`Scene`, the keyboard hooks
  (`useKeyboardShortcuts`, `useCameraKeyState`), the `SceneAssetErrorBoundary`,
  the `EditorOverlay`, `Announcer`, `Toaster`. Owns `roomViewHasFocus` (local
  `useState` — producer and consumer are co-located here, intentionally not a
  store).
- **`src/app/chrome/editor-overlay.tsx`** (~169 lines) — overlay shell. Still
  takes a grouped `EditorOverlayProps` (topHeader/outliner shell props +
  `onConfirmDeleteSelection`/`onRetryAssetLoading`).
- **`src/app/controllers/`** — 12 hooks that currently encapsulate the action
  logic App orchestrates (see §6).

---

## 4. History — what we did and why it matters

Newest last. Commit hashes are post-rebase (message bodies were reworded; tree
content unchanged). Run `git log --format='%h %s' main..HEAD` for the live list.

### Phase 0 — editor-surface & DOM/focus hardening (precursor)

`feat(keyboard): Phase 1 pane-navigation shortcuts` →
`refactor(surface/layout/editor-surface): inspector parity, DOM order, flatten
overlay`. Established a canonical selection inspector, deterministic DOM/focus
order, explicit pane-navigation shortcuts, and **explicit focus-intent state**
(no persisted "selected-source" inference). (Plan retired; shipped.)
**Why it's relevant:**
it created `selection-meta-store` (selection source + outliner focus requests)
and the focus-intent model that the later selection-effects logic and the
command focus-pane actions depend on.

### Phase 1 — Dialog reorganization (the precedent for everything after)

`refactor(dialogs): migrate to registry-driven active surface model` →
`harden selection interactivity and sharpen dialog boundaries` →
`refactor(top-header): own dialog focus return via header registry`. (Plan
retired; shipped — see `docs/editor-state-architecture.md` § Dialog
Orchestration.) Replaced hardcoded per-dialog App wiring with
a **generic `dialog-store` + feature-owned `DialogDefinition`s + a single app
bootstrap** (`src/app/dialogs/`). Feature definitions declare `kind`, open
guards, and payload derivation without importing app-shell code.
**Why it's the template:** this is the first and cleanest demonstration of the
target pattern — a neutral store holds generic state, features own their rules
via a contract, and App shrinks to bootstrap. The store-vs-context split, the
`*-contract.ts` neutral-type file, and the "feature declares, app aggregates"
shape all recur in the command model and should recur in the work ahead.

### Phase 2 — Command model (keyboard de-threading)

`refactor(keyboard): de-thread shortcuts via command dispatch`. Introduced the
typed `EditorCommand`/`runEditorCommand`/`EditorCommandApi` + ref-backed dispatch
context described in §3(b). The keyboard hook went from ~18 action callbacks +
the executor switch down to **gating inputs + a single `dispatch`**.

### Phase 3 — Overlay buttons dispatch (concrete de-threading wins)

`history` (undo/redo) → `camera` (4 presets + focus-selected) →
`selection` (rotate + open-delete). Each converted the relevant overlay/site
component to consume `useCommandDispatch()` and **removed its `on*` props** from
`EditorOverlay` and App. Notable detail: only the _site_ components
(`docked-/floating-selected-item-site`) consume dispatch; the presentational
leaves (`SelectionToolsOther`, `SelectedDetailsView`) stay prop-driven. Share
intentionally stayed a callback (Promise-returning) for now.

### Phase 4 — Composition-root split

`refactor(app): split composition root into outer App + inner EditorBody` →
`hoist EditorShell out of EditorBody into App`. Extracted the editor surface JSX
into `EditorBody`, which reads stores directly and hosts the keyboard hooks,
killing the **dispatch-prop double-pass**. App became the outer root that only
builds the api and assembles providers.

### Phase 5 — Store migrations (the most recent slices)

- `refactor(editor-state): move announcements into a store` (**Cluster A**) —
  replaced the threaded `useAnnouncements()` hook with `announcement-store`;
  controllers/App call `announcementActions` directly; `EditorBody` reads via
  selector hooks. Module-level timers preserve SR timing. Removed a whole
  threaded hook + its prop-pass.
- `refactor(selection): move detail-edit handlers into a selection action
module` (**Cluster B**) — moved the selected-item detail-edit handlers out of
  `use-movement-controller` into
  `src/features/selection/selected-item-detail-actions.ts`, consumed **directly**
  by `docked-selected-item-site` (no longer threaded through App/EditorOverlay).
  Detail message formatters went to `shared/messages`. **This is the proof that
  an action-shaped handler can become a `.getState()`-reading module in the
  owning feature** — the pattern the remaining controller work should follow.

(The most recent commit extracted a shared `selectSelectedFurniture` selector —
a minor cleanup, not load-bearing for the roadmap.)

**The throughline:** every phase replaced "App threads a value down" with either
"the consumer reads a store" or "the consumer dispatches a typed command", and
moved logic toward the feature that owns it. The dialog reorg is the canonical
shape; the command model and the store migrations are the same idea applied to
keyboard actions and cross-cutting state.

---

## 5. Current state snapshot

What App still does (the remaining concentration of responsibility):

- Reads ~8 store slices + runs `useStartupState`/`useDraftPersistence`.
- Instantiates **12 controller hooks**, feeding most of them
  `editorInteractionsEnabled`, `selectionEffects`, and dialog-action wrappers.
- Builds a `handlers` mega-object (spread of all controllers + a few local
  `useCallback`s: `handleSetCameraPreset`, `handleFocusSelected`, the three
  `handleFocus*` pane handlers).
- Assembles the `EditorCommandApi` from `handlers`.
- Threads a grouped `editorOverlay={{ topHeader, outliner, onConfirmDelete…,
onRetry… }}` prop into `EditorBody`.

File sizes: App 507, EditorBody 211, EditorOverlay 169.

---

## 6. Outstanding targets (with context; not implementation plans)

These are ordered by leverage. They are interdependent — read §6.4 for how they
fit together before sequencing.

### 6.1 KEYSTONE — promote `selectionEffects` out of an App-owned hook

**File:** `src/app/controllers/use-selection-effects-controller.ts`.
**Shape:** a stateful hook that returns an imperative `SelectionEffectsApi`:
`notePendingSelection`, `notePendingSource`, `notePostDeleteOutlinerFocusIndex`,
`notePostDeleteFocusTarget`, `consumePostDeleteFocusTarget`. Internally it holds
~6 `useRef` cells (pending source, pending behavior, post-delete focus
target/index, last-reconciled ids) and **4 `useEffect`s** that watch
`selectedId`/`items` changes to: reconcile `selectionMetaActions.setSelectedSource`,
emit the correct SR announcement via `announcementActions.announcePolite`
(`announceSelectionChange` covers added/panel-keyboard/canvas-keyboard/default
modes), and fire post-delete outliner focus requests.

**Why it's the keystone:** this single hook's api is threaded into **6
controllers** — `selection`, `history`, `deletion`, `catalog`, `start-over`,
`asset-lifecycle`. It is the primary reason App must instantiate all those
controllers centrally (to share one ref-backed instance). Everything in §6.2
is blocked on it.

**Why it's tractable:** the refs are just mutable cells (module-level-able, like
`announcement-store`'s timers), and the effects are `selectedId`/`items`
reconciliations that a `subscribeWithSelector` subscription on
`scene-state-store` can drive outside React. `editorInteractionsEnabled` (its
only non-ref input) is **already** a store value
(`editorRuntimeStore.getState()`), so it does not need to be a hook arg. The
announcement and selection-meta sinks it writes to are already module actions.
This is the same port shape as Cluster A, one level more involved (it has a
store _subscription_, not just timers).

**Decision space for the implementing agent (don't pre-decide):** whether this
becomes a full `selection-effects-store` vs a module of `.getState()`-reading
action functions + an init-time subscription; how the post-delete focus
hand-off (currently ref + `consume…`) is modeled; whether the SR-announce
reconciliation should be a store subscription registered once at startup or kept
as a thin effect in `EditorBody`. Note the **ordering subtlety**: today the
effects run in a deterministic React commit order relative to selection changes;
a subscription-based port must preserve the "note pending behavior _before_ the
selection mutation, reconcile _after_" sequencing. This is the main risk and
deserves the most test attention (selection announce modes + post-delete focus
target are covered by e2e `editor-accessibility-flows.spec.ts` and the
controller's own test).

### 6.2 Migrate the action-shaped controllers into store-reading modules

Once §6.1 lands, most controllers lose their two reasons to be React hooks
(the `selectionEffects` param and store reads via selector hooks like `useItems`
— which become `.getState()` reads). Representative examples already verified:

- `use-deletion-controller.ts` — pure orchestration: reads `useItems`/
  `useSelectedSource`, calls `sceneCommands.deleteSelection`/`isSceneReady`,
  `dialogActions` (via injected `closeActiveDialog`/`openDeleteDialog`),
  `announcementActions`, and `selectionEffects.note*/consume*`. No React state of
  its own — a textbook module candidate (mirror Cluster B).
- `use-share-controller.ts` — `async` handler wrapping `serializeSceneToUrl` +
  `navigator.share`/clipboard + `sceneStateActions`/`announcementActions`. Its
  only inputs are `activeFloorFinishId`/`activeWallFinishId` (derivable) and
  `useItems`. Fully action-shaped.
- Same character: `use-start-over-controller`, `use-catalog-controller`,
  `use-asset-lifecycle-controller`, `use-selection-controller`, and
  `use-movement-controller` (already trimmed to actions in Cluster B).

**Stay-as-hooks / become-stores (do NOT force into modules):**
`use-preview-controller` (owns `previewedId` React state),
`use-canvas-keyboard-controller` (owns `previewedIdRef` + browse), and
`selection-effects` itself (the §6.1 store). These are genuinely stateful.

**Payoff:** App stops being the controller orchestrator. The `EditorCommandApi`
can be assembled from module functions (or a thin coordinator) rather than from
12 hook instances; feature components that today receive threaded callbacks can
import the action directly (the Cluster B win, repeated). Watch the boundary
rule: an action module consumed by a _feature_ must live in `editor-state` or
the feature itself (a feature cannot import `@/app/**`) — Cluster B put the
selection detail actions in `features/selection`. Deletion/share/start-over are
more app-level (dialog + url + startup concerns); their correct home is a
genuine decision (likely `editor-state` action modules or `app/`-level modules
consumed only by the command api / overlay shell). The implementing agent should
decide per-controller based on who consumes it.

### 6.3 De-thread the top header and the remaining overlay props

**File:** `src/app/chrome/editor-overlay.tsx` (`EditorOverlayProps`) and
`src/app/chrome/top-header/*`. The overlay still threads:
`topHeader` shell props (catalog, environmentConfig, catalogIdToAdd,
`onAddFurniture`, `onCatalogIdToAddChange`, `onCatalogDrawerOpenChange`,
`onShareSceneUrl`, `onOpenStartOverDialog`, `onConfirmStartOver`),
`outliner` (`onSelectById`, `onPreviewChange`), plus
`onConfirmDeleteSelection`/`onRetryAssetLoading`. These are the **last
significant `on*` threads**. Some are genuine commands (start-over, share — note
the deferred share decision) and could extend the command model or dispatch;
others (add-furniture, catalog id state) are catalog-feature-local and could be
read/owned in the feature once §6.2 frees their action logic. This phase is
mostly _consequent_ on §6.1/§6.2 and should be planned after them.

### 6.4 How they fit together (sequencing logic)

`selectionEffects` (6.1) is the linchpin: it forces central controller
instantiation, which forces App to assemble `handlers`, which forces the grouped
overlay prop. Unwinding in order — **6.1 → 6.2 → 6.3** — means each step removes
the _reason_ the next step's threading exists, rather than fighting it. Doing
6.2 or 6.3 first would mean repeatedly re-plumbing `selectionEffects` and would
not actually shrink App. The single highest-leverage next move is therefore the
`selectionEffects` port; it is also the riskiest (focus/announce ordering), so
it warrants a dedicated spike + plan before code.

### What NOT to chase (explicitly out of scope / low value)

- Collapsing `EditorBody`'s scene-wiring props for their own sake — the `Scene`
  genuinely needs catalog/collections/preview/option props; low payoff.
- A speculative "selection store" beyond what §6.1 actually requires.
- Moving `roomViewHasFocus` to a store — producer and consumers are co-located
  in `EditorBody`; a store would disperse a tight loop with no external consumer.
- A runtime/remappable command registry — off the roadmap by design.

---

## 7. Working conventions for this repo

- **Validation gate (run before finalizing):** `pnpm fix` → `pnpm typecheck` →
  `pnpm lint` → `pnpm test:run` → `pnpm knip`. For behavior touching focus/
  keyboard/announcements, also `pnpm test:e2e e2e/editor-accessibility-flows.spec.ts`
  (and `editor-hotkeys.spec.ts`). Frame-time-sensitive flows: `pnpm test:browser:perf`.
- **`knip` baseline:** there is a known set of ~9 unused exports + 1 type
  (dialog-definition ids, `findFirstFocusableControl`, `INITIAL_DIALOG_STORE_STATE`,
  `ActiveSurfaceState`). New work should not _add_ to this; matching the baseline
  is "clean".
- **Commits:** Conventional Commits, one logical change per commit, separately
  committed slices. **Body must be a bullet list of leading-lowercase imperative
  phrases** (no prose paragraphs), describing the final state. See
  `.agents/skills/git-commit/SKILL.md`. Recent history is the style reference.
- **Imports:** use the `@/` alias (eslint forbids parent-relative `../`); respect
  the layer boundaries in §3. `pnpm lint` enforces both.
- **Test pattern for store/action modules:** `vi.mock` the store actions module
  (factory of `vi.fn()`s), drive scene state via `sceneStateActions.setHistory`/
  `setSelectedId`, set readiness via `editorRuntimeActions.markAssetsReady()`,
  spy `sceneCommands.*`, `vi.clearAllMocks()` in `afterEach`. See
  `src/features/selection/selected-item-detail-actions.test.ts` and
  `src/editor-state/announcement-store.test.ts`.

## 8. Pointers

- Boundary policy: `docs/architecture-boundaries.md`, `eslint.config.js`.
- Editor-state responsibilities: `docs/editor-state-architecture.md`.
- Dialog reorg + surface/keyboard precursor: plans retired (shipped); durable
  detail lives in `docs/editor-state-architecture.md` and the git history.
- Agent contract + task routing: `AGENTS.md`, `.agents/policies/*`.
- Live history: `git log --format='%h %s' main..HEAD`.
