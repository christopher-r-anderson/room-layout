# Plan: Promote `selectionEffects` Out Of The App-Owned Hook (Handover §6.1)

> **Status:** Slices 1 & 2 shipped (green). Slice 3 (C2) deferred as optional.
> Branch `editor-surface-keyboard-architecture-refactor`.
> **Progress:** Slice 1 `refactor(editor-state): extract selection-effects module
> and reconciler`; Slice 2 `refactor(selection): consume selection-effects module
> directly`. Keystone §6.1 de-threading complete — App no longer owns or threads
> `selectionEffects`; all 6 consumers import the module. Slice 3 (promote the
> reconciler to a startup `scene-state-store` subscription) remains optional and
> isolates the timing risk; not started.
> **Decisions locked:** A = **C1 now** (thin reconciler hook), optionally promote
> to C2 (startup subscription) later. B = reconciler lives in `editor-state`,
> invoked from the original site in `App.tsx` (not `EditorBody`) to preserve effect
> commit-order exactly — lowest timing risk. C = atomic six-consumer de-thread in
> Slice 2 if green.
> **Scope:** the keystone §6.1 port only. §6.2 (controller→module) and §6.3
> (overlay/top-header de-threading) are explicitly downstream and out of scope
> here; this plan only removes the _reason_ they are blocked.
> **Source of truth for context:** `plans/app-dethreading-and-stores-handover.md`.

---

## 1. Current state — precise characterization

**File:** `src/app/controllers/use-selection-effects-controller.ts` (235 lines).
A stateful React hook, instantiated **once** in `App.tsx:191`, whose return value
(`SelectionEffectsApi`) is threaded into 6 controllers. It produces no rendered
output — it only **writes** to other stores as a side effect of selection/items
changes, and exposes imperative "note pending intent" setters that consumers call
around their scene mutations.

### 1a. Inputs

- `editorInteractionsEnabled: boolean` — the **only** hook arg. Already a derived
  store value: `editorRuntimeStore.getState().startupPhase === 'ready'`
  (selector `useEditorInteractionsEnabled`, runtime store line 214). It does **not**
  need to be a React arg.
- `useItems()` → `scene-state-store.history.present`.
- `selectedId` → `scene-state-store.selectedId`.
- `useOutlinerFocusRequest()` → `selection-meta-store.outlinerFocusRequest`
  (read as a guard + effect dep).

### 1b. The 6 ref cells (all imperative scratch, none reactive)

| Ref                                                                                            | Purpose                                                                                  |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pendingSelectionSourceRef` (`InteractionSource`)                                              | source to apply on next selection reconcile                                              |
| `pendingSelectionChangeBehaviorRef` (`PendingSelectionChangeBehavior \| null`)                 | announce mode + outliner-focus intent for next change                                    |
| `previousReconciledSelectedIdRef` (`string \| null`, init `null`)                              | de-dupes the source-reconcile effect                                                     |
| `previousSelectionSideEffectSelectedIdRef` (`string \| null`, **init = current `selectedId`**) | de-dupes the announce effect; the mount-time init suppresses an announce on first render |
| `pendingPostDeleteOutlinerFocusIndexRef` (`number \| null`)                                    | queued outliner index to focus after a delete-driven items change                        |
| `pendingDeleteFocusTargetRef` (`'room-view' \| 'outliner' \| null`)                            | post-delete focus hand-off, written on dialog-open, read+cleared on confirm              |

These are exactly the "module-level-able mutable cells" the handover compares to
`announcement-store`'s timers — nothing renders from them.

### 1c. The 4 effects (commit order matters)

Effects run in React commit order on every relevant store-driven re-render. The
ordering and the **deferral past the synchronous handler** are the load-bearing
behaviors (see §4 risk):

1. **Post-delete outliner focus** — dep `[items]`. If
   `pendingPostDeleteOutlinerFocusIndexRef` is set, clears it and calls
   `selectionMetaActions.requestOutlinerFocus({ token, preferredIndex })`. Fires on
   the items-array identity change that a delete produces.
2. **Selection-source reconcile** — dep `[editorInteractionsEnabled, selectedId]`.
   On a real `selectedId` change, reads+clears `pendingSelectionSourceRef`, records
   `previousReconciledSelectedIdRef`, and calls
   `selectionMetaActions.setSelectedSource(selectedId === null ? null : pendingSource)`.
3. **Announce + outliner-focus-on-change** — dep
   `[editorInteractionsEnabled, items, outlinerFocusRequest, selectedId]`. On a real
   `selectedId` change: reads+clears `pendingSelectionChangeBehaviorRef` (default
   `{ announceMode: 'default', requestOutlinerFocus: false }`), runs
   `announceSelectionChange(...)` (the pure mode switch:
   `added`/`panel-keyboard`/`canvas-keyboard`/`default`/`suppress`), and if
   `requestOutlinerFocus` and no request is already pending, requests outliner
   focus (`targetSelectedId` when selecting, `focusContainer` when clearing).
   Records `previousSelectionSideEffectSelectedIdRef`.
4. **Clear-stale-behavior** — dep `[editorInteractionsEnabled, items, selectedId]`.
   When `items` changed but `selectedId` did **not**, drops a now-stale
   `pendingSelectionChangeBehaviorRef`. (Covered by the
   "clears stale pending behavior" test.)

`announceSelectionChange` is a module-private pure function (lines 26–80) — it has
no React dependency and ports verbatim.

### 1d. The 5-method imperative API (`SelectionEffectsApi`)

All five are stable `useCallback`s wrapping ref writes/reads — no reactive
dependency:

- `notePendingSelection(behavior | null)` → sets behavior ref
- `notePendingSource(source)` → sets source ref
- `notePostDeleteOutlinerFocusIndex(index | null)` → sets index ref
- `notePostDeleteFocusTarget(target | null)` → sets focus-target ref
- `consumePostDeleteFocusTarget()` → reads+clears focus-target ref

### 1e. The 6 consuming controllers (what each calls)

| Controller                       | API calls                                                                                                               | Mutation it brackets                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `use-selection-controller`       | `notePendingSelection`, `notePendingSource`                                                                             | `selectById` / clear (note **after** mutate) |
| `use-history-controller`         | `notePendingSelection`                                                                                                  | `undo` / `redo` (note after)                 |
| `use-deletion-controller`        | `notePendingSelection`, `notePostDeleteOutlinerFocusIndex`, `notePostDeleteFocusTarget`, `consumePostDeleteFocusTarget` | `deleteSelection` + dialog-open/confirm      |
| `use-catalog-controller`         | `notePendingSource`, `notePendingSelection`                                                                             | `addFurniture` (note after)                  |
| `use-start-over-controller`      | `notePendingSelection`                                                                                                  | `restoreInitialLayout` (note after)          |
| `use-asset-lifecycle-controller` | `notePendingSelection`                                                                                                  | restore flow (note after)                    |

All six receive the api purely as a threaded param; **none holds the api in React
state**. `App.tsx` builds one instance and passes it to each (lines 191, 259, 269,
276, 282, 291, 300).

### 1f. The ordering invariant (the whole reason this is delicate)

`sceneCommands.undo/redo/selectById/deleteSelection/addFurniture/restoreInitialLayout`
write `scene-state-store` **synchronously** (traced: `sceneCommands.undo()` →
`scene.tsx:389` `sceneStateActions.setHistory/setSelectedId`). Every consumer does
**mutation-then-note inside one synchronous handler**. The current design only
works because the 4 effects are **deferred by React** until after the handler
returns — so by the time reconciliation reads the refs, all `note*` writes have
landed. Any port that reconciles **synchronously inside the store write** would run
before the `note*` calls and read stale/empty cells. This is the central
constraint, restated by the handover as "note pending behavior before the
selection mutation, reconcile after."

---

## 2. Recommended target shape

### 2a. Split: imperative API + cells → module; reconciliation → its own seam

Decompose the hook into two parts with different homes:

1. **`src/editor-state/selection-effects.ts`** — a `.getState()`-style module
   (no React). Holds the 6 cells as module-level `let`s (the `announcement-store`
   timer precedent) and exports a `selectionEffects` actions object with the 5
   methods. This is what the 6 consumers import directly — and importing it is
   what **de-threads all six controllers** and unblocks §6.2.
2. **The reconciliation** (the 4 effects + `announceSelectionChange`) — reads the
   module cells, reads `scene-state-store`/`selection-meta-store`/runtime, writes
   `selection-meta-store` + `announcement-store`.

**Home decision — `editor-state`.** This is cross-feature coordination state read
from scene state and written to two editor-state stores; placement rule 3 ("cross
-feature state in `editor-state`, not feature-local") and the boundary that a
module consumed by features must not live in `app/**` both point here. It imports
only `editor-state` stores + scene contracts — no `app`/`features`/`shared/ui`
imports — so it satisfies the editor-state boundary. **This is a firm
recommendation, not a fork.**

### 2b. Store vs module — recommendation: **module + cells, not a Zustand store**

Unlike `announcement-store` (which also has _reactive_ output —
`politeAnnouncement`), selection-effects has **zero reactive output**: no component
selects from it; it only writes to other stores. A full `createStore` +
`subscribeWithSelector` + selector hooks would be ceremony with no subscriber. So:
module-level cells + a plain actions object, mirroring Cluster B
(`selected-item-detail-actions.ts`) one level up. **Recommended.** (Fork is _not_
store-vs-module; it is where the reconciliation runs — see §2c.)

### 2c. FORK — where reconciliation runs (needs your input, see §6 Decision A)

Two viable homes for the 4 effects. Both consume the same `selection-effects.ts`
module; the choice does **not** change the consumer migration or unblock status of
§6.2 — it only affects the reconciler's own wiring and the timing-risk surface.

- **Option C1 — thin reconciler hook in `EditorBody`** (`useSelectionEffectsReconciler()`).
  Keep the 4 effects as effects verbatim (refs → module cells, arg → store read),
  mounted where the old hook conceptually lived. **Preserves React commit-order +
  deferral semantics exactly** → lowest timing risk. Cost: a small piece of
  reactive wiring stays in the app shell (but the _api_ — the threaded part — is
  fully gone). The reconciler hook would live in `editor-state` as a hook export
  and be invoked from `EditorBody`, or as an app-level hook in `app/chrome`.
- **Option C2 — startup `scene-state-store` subscription, fully outside React.**
  Register once (idempotent, like `bootstrapDialogRegistry`) a
  `subscribeWithSelector` listener on `{ items, selectedId }`. **Must** re-introduce
  the deferral the React model gave for free — e.g. `queueMicrotask` with a
  scheduled-flag so multiple synchronous `setState`s (undo writes history **and**
  selectedId) collapse into one reconcile that runs **after** the handler's
  `note*` calls. Architecturally purest (zero React, App shrinks most), but it owns
  the timing risk directly and needs the most test attention.

**My recommendation: stage it.** Ship **C1 first** (keystone value, minimal risk),
then optionally promote to **C2** as a separate, independently-reversible slice
where the timing risk is isolated and test-covered. If you prefer to commit to the
end-state in one move, we do C2 directly. I lean C1-then-optionally-C2.

### 2d. How the two delicate behaviors are preserved

- **"note before mutation, reconcile after"** — In C1, preserved automatically:
  effects stay deferred past the synchronous handler. In C2, preserved via the
  `queueMicrotask` deferral so reconcile never runs inside the store write.
- **Post-delete focus hand-off** — Stays a cell + `consume` (read-once-clear).
  `use-deletion-controller` notes the target on dialog-open and consumes it on
  confirm; this is pure imperative bracketing with no effect involvement, so it is
  identical in C1 and C2.
- **Mount-time announce suppression** — `previousSelectionSideEffectSelectedIdRef`
  inits to the _current_ `selectedId`. In C2 the subscription registers at startup
  when `selectedId` is `null`, so a `null` init is equivalent. In C1 the reconciler
  hook must seed its "previous" cell to the current `selectedId` on first run to
  keep suppressing the first-render announce. **Migration detail to honor either
  way.**

---

## 3. Migration steps (small, separately-committed, green slices)

Each slice ends green against the gate in §4. One logical change per commit.

**Slice 1 — extract `selection-effects.ts` module + reconciler, keep behavior.**

- Create `src/editor-state/selection-effects.ts`: 6 module cells, the 5-method
  `selectionEffects` actions object, the ported `announceSelectionChange`, plus a
  `resetSelectionEffects()` for tests.
- Implement the reconciler per the chosen Decision A option (C1 hook or C2 startup
  subscription). Wire it in (`EditorBody` for C1; a bootstrap call for C2).
- Keep `App.tsx` passing the (now module-backed) api for this slice **only if it
  reduces diff size** — preferably collapse in Slice 2. Move/port the existing
  `use-selection-effects-controller.test.ts` to a `selection-effects.test.ts` (or a
  reconciler test) driving scene state via `sceneStateActions.setHistory/setSelectedId`,
  `editorRuntimeActions.markAssetsReady()`, mocking `announcement-store`, asserting
  on `selection-meta-store` — same harness as the current controller test.
- `git commit`: `refactor(editor-state): extract selection-effects module + reconciler`

**Slice 2 — migrate the 6 consumers to import the module; delete the hook.**
For each controller: drop the `selectionEffects` param + `SelectionEffectsApi`
import, import `{ selectionEffects }` from `@/editor-state/selection-effects`, and
call methods directly. Then in `App.tsx`: remove the
`useSelectionEffectsController` call and the `selectionEffects` arg from all six
controller call-sites. Delete `use-selection-effects-controller.ts` and its old
test if fully superseded. Update each controller test to `vi.mock` the
`selection-effects` module (factory of `vi.fn()`s) and assert on the mock — the
same shape these tests already use for the `announcement-store` mock (they
currently build a local `createSelectionEffects()` fake; swap to the module mock).

- This can be **one commit** (atomic de-thread) or split selection/history/deletion
  vs catalog/start-over/asset-lifecycle if the diff is large. Prefer atomic if green.
- `git commit`: `refactor(selection): consume selection-effects module directly`

**Slice 3 (only if Decision A = stage to C2) — promote reconciler to startup subscription.**
Replace the C1 hook with the C2 subscription + `queueMicrotask` deferral; remove
the `EditorBody` mount point. Add focused timing tests (§4). Separate, reversible.

- `git commit`: `refactor(editor-state): drive selection-effects via store subscription`

`selectionEffects.types.ts` currently lives in `app/controllers/_shared/`. It moves
beside the module in `editor-state` (it is a neutral type — `editor-state` is its
correct home).

---

## 4. Test strategy & validation gate

### Unit

- **`selection-effects` / reconciler test** (ported from the existing controller
  test): the 4 existing cases — post-delete outliner focus on items change;
  source reconcile only on real change; announce for each special mode
  (`added`/`panel-keyboard`/`canvas-keyboard`); clear-stale-behavior. Harness per
  handover §7: `vi.mock` `announcement-store`, drive `sceneStateActions`, set
  readiness via `editorRuntimeActions.markAssetsReady()`, reset stores in
  `beforeEach`, `vi.clearAllMocks()` in `afterEach`.
- **6 controller tests**: switch from passing a fake api to `vi.mock`ing the
  module; assertions unchanged in spirit (same method-call expectations).
- **C2-only timing test**: in one synchronous act, call
  `sceneStateActions.setSelectedId/setHistory` (mutation) **then**
  `selectionEffects.notePendingSelection(...)`, flush microtasks, assert the
  reconcile used the noted behavior (proves reconcile deferred past `note*`). Also
  assert a single undo (history + selectedId writes) yields exactly one reconcile.

### a11y e2e (handover §7 mandates these for focus/keyboard/announce work)

- `pnpm test:e2e e2e/editor-accessibility-flows.spec.ts` — selection announce modes
  - post-delete focus target (the flows the handover names as the coverage for this
    behavior).
- `pnpm test:e2e e2e/editor-hotkeys.spec.ts` — keyboard-driven selection/undo/redo
  still announce + focus correctly.

### Validation gate (run before finalizing each slice)

`pnpm fix` → `pnpm typecheck` → `pnpm lint` → `pnpm test:run` → `pnpm knip`, then
the two e2e specs above. `knip` must match the known baseline (must not _add_
unused exports — watch the moved `selectionEffects.types` / removed hook export).

---

## 5. Risks

1. **Ordering/timing (highest).** A C2 subscription that reconciles synchronously
   inside the store write runs before `note*` → wrong announce/source. Mitigation:
   `queueMicrotask` deferral + the C2 timing test; or pick C1 (no risk). The
   undo-writes-twice case (history + selectedId) must collapse to one reconcile.
2. **Mount-time announce suppression** lost if the C1 "previous" cell isn't seeded
   to current `selectedId` on first run. Mitigation: explicit seed + the existing
   "only on real change" test, extended to assert no announce on first observation.
3. **`outlinerFocusRequest` guard** in effect 3 reads `selection-meta-store`; under
   C2 read it via `selectionMetaStore.getState()` at reconcile time, not a captured
   value, to match the live-guard semantics.
4. **`knip`/boundary drift** from moving the types file and deleting the hook
   export. Mitigation: gate run + grep for stale `SelectionEffectsApi` imports.
5. **Test double swap** across 6 controller tests is mechanical but broad; a missed
   file shows up as a typecheck/lint failure, not silent.

---

## 6. Decisions I want your input on before coding

**Decision A — where reconciliation runs (and whether to stage).**

- A1: C1 (thin reconciler hook in `EditorBody`) now; optionally promote to C2 later.
  _(my recommendation)_
- A2: C2 (startup store subscription) directly — commit to the end-state in one go.
- A3: C1 and stop — keep the reconciler a hook permanently (don't pursue C2).

**Decision B — reconciler home if C1.** `editor-state` (hook exported from the
neutral layer, invoked by `EditorBody`) vs `app/chrome` (app-level hook). I lean
`editor-state` for symmetry with the module, but the hook is only consumed by the
app shell, so `app/chrome` is defensible.

**Decision C — Slice 2 granularity.** Atomic six-consumer de-thread in one commit
(my preference if green) vs split into two commits by feature cluster.

I will not start editing until you confirm Decision A (B and C can default to my
recommendations if you don't specify).
