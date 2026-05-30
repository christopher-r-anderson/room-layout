# UI Branch Cleanup Plan

**Branch:** `ui` → merging into `main`  
**Constraint:** No behavior changes. All edits must be structural/cosmetic.  
**Validation gate after every phase:** `pnpm typecheck && pnpm lint && pnpm test:run`. E2E (`pnpm test:e2e`) only where called out.

---

## Phase 0 — Baseline (~15 min)

Lock in a known-good baseline so later phases can be diff-bisected if a regression appears.

**Steps**

1. `git status` → ensure clean tree, on `ui`.
2. Run the full validation suite once and record results:
   - `pnpm install`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test:run`
   - `pnpm test:e2e`
3. Save the Vitest `--reporter=json` output (or simply note total test count) for comparison after each refactor phase. Coverage should not decrease.

**Commit:** none.  
**Stop condition:** if anything is red on `ui` today, fix or document before proceeding.

---

## Phase 1 — Split `use-scene-handlers.test.ts` (lowest risk, highest navigability win)

Single 1697-line file, three independent concerns sharing navigator/scene-ref boilerplate.

**Files affected**

- use-scene-handlers.test.ts — split into 4 files.

**Target structure**

- use-scene-handlers.test.ts — keep only the **core handlers** describe block (selection, move, rotate, delete, focus, basic plumbing).
- `src/app/use-scene-handlers.share.test.ts` — the entire **share URL / `navigator.share`** describe block (~8 tests, all the navigator mock setup).
- `src/app/use-scene-handlers.source.test.ts` — the **selection-source attribution / rotation conversion** describe block (~10 tests).
- `src/app/use-scene-handlers.startup.test.ts` — the **startup restore** describe block at lines ~1943–2145 (~7 tests).

**Mechanical procedure**

1. Identify the four describe blocks with `grep_search` for `^describe(` and the `Share`, `selectedSource`/`source`, `Startup` substrings.
2. For each new file:
   - Copy the imports the block actually references (use `pnpm typecheck` to prune unused).
   - Move any local helpers used **only** by that block.
   - **Do not extract** shared helpers in this phase — that's Phase 7.
3. Keep the original file's helpers/setup that remain used.

**Test considerations**

- Vitest auto-picks up new `*.test.ts` files. No config change needed.
- Total test count after Phase 1 must equal the Phase 0 baseline. If counts diverge by even one, a `it`/`test` was orphaned.
- Run `pnpm test:run -- use-scene-handlers` to confirm all four files load.
- Watch for `vi.mock(...)` hoisting — module mocks at the top of the original file must be **duplicated** at the top of every new file that depends on them. This is the most common breakage point for split test files. Verify by searching for `vi.mock(` in the original and ensuring each new file has only the mocks it actually needs.
- `beforeEach`/`afterEach` resets that were file-scoped become per-file; verify each new file restores `navigator`/timers/spies it touches.

**E2E impact:** none. No production code changes.

**Review/commit gate**

- `pnpm typecheck && pnpm lint && pnpm test:run` (test count unchanged)
- Commit: `test(scene-handlers): split use-scene-handlers tests by concern`

---

## Phase 2 — Split selected-toolbar-placement.ts (1322 lines → 4 files)

The single biggest readability win in the branch. Pure file-move + re-exports; zero logic change.

**Files affected**

- New: src/lib/ui/rect-utils.ts
- New: src/lib/ui/convex-geometry.ts
- New: src/lib/ui/toolbar-anchors.ts
- Modified: selected-toolbar-placement.ts — keeps types + scoring + public API
- Modified (optional): split test file alongside

**Exact partition** (line numbers from the read above)

| New file                             | Moves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Source lines                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `rect-utils.ts`                      | `Rect` interface, `getRectRight`, `getRectBottom`, `getDomRectRight`, `getDomRectBottom`, `intersects`, `clamp`, `fitsContainer`, `getContainerRect`, `toAbsoluteRect`, `avoidsExclusions`, `createRect`, `getRectIntersectionArea`, `getRectDistance`, `getRectCorners`, `inflateRect`                                                                                                                                                                                              | 36–42, 101–209, 377–384, 562–569                |
| `convex-geometry.ts`                 | `ScreenPoint` (re-export from here), `crossProduct`, `getConvexHull`, `pointInRect`, `pointInPolygon`, `orientation`, `onSegment`, `segmentsIntersect`, `rectIntersectsPolygon`, `getLineIntersectionAtY`, `getLineIntersectionAtX`, `getContourXAtY`, `getContourYAtX`, `getContourXInYRange`, `getContourYInXRange`, `getPointBounds` (+ `PointBounds`)                                                                                                                            | 1–4, 43–48, 210–561                             |
| `toolbar-anchors.ts`                 | `ToolbarSide`, `ToolbarFloatingCandidateId`, `CandidateAnchorDefinition`, `CANDIDATE_ANCHOR_DEFINITIONS`, `getAnchor`, `createRectFromAnchor`, `adjustRectToContainer`, `getAttachmentDistance`, `resolveCandidateAnchor`, `getCandidateAnchors`                                                                                                                                                                                                                                     | 12–25, 61–65, 90–100, 571–717, 718–723, 824–877 |
| selected-toolbar-placement.ts (kept) | All `*` constants (67–88), `ToolbarGeometrySource`, `ToolbarPlacementMode`, `ToolbarPlacement`, `FloatingCandidate`, `getDiagonalSidePreference`, `getDiagonalSideBiasStrength`, `getSidePreferencePenalty`, `getMinimumExclusionDistance`, `createFloatingCandidate`, `isLowConfidenceGeometry`, `scoreCandidate`, `createFloatingCandidates`, `getFirstValidRect`, `getDockedPlacement`, `getDockedResult`, **`computeSelectedToolbarPlacement`** (the only public consumer entry) | 6–11, 27–35, 50–60, 67–88, 725–end              |

**Public API contract**
External consumers only import: `ToolbarPlacement`, `ToolbarPlacementMode`, `ToolbarSide`, `ToolbarFloatingCandidateId`, `ToolbarGeometrySource`, `ScreenPoint`, `computeSelectedToolbarPlacement`, `getDockedPlacement` (verified via grep — only selected-item-actions.tsx and selected-item-controls.tsx import from this path).

**Two acceptable strategies** — pick one and stick to it:

- **Strategy A (recommended): re-export façade.**  
  Keep selected-toolbar-placement.ts as the public barrel; `export * from './rect-utils'` etc. (only the items the public API references). External imports stay unchanged. Lowest churn.

- **Strategy B: explicit imports per consumer.** Update selected-item-actions.tsx and selected-item-controls.tsx to import from the new specific modules. Slightly cleaner long-term but expands the diff.

**Mechanical procedure**

1. Create the 3 new files with copy-pasted bodies + their direct dependencies as imports.
2. Replace each moved function in selected-toolbar-placement.ts with `import` from the new files.
3. Resolve circulars: `toolbar-anchors.ts` imports from `rect-utils.ts` and `convex-geometry.ts`; `convex-geometry.ts` imports `Rect` from `rect-utils.ts`; selected-toolbar-placement.ts imports from all three. **No reverse arrows.**
4. Run `pnpm typecheck` after each new file is wired up.

**Test considerations**

- selected-toolbar-placement.test.ts (368 lines) tests the public API and continues to pass unchanged when using Strategy A.
- **Optional, not required this phase:** add small focused tests next to each new module if a behavior is currently _only_ asserted indirectly. Skip if existing coverage is sufficient.
- No E2E impact expected — but: selected-toolbar-placement.spec.ts exercises the full placement flow in the browser. Run it as a confidence check (it's the canonical contract test).

**Validation**

```
pnpm typecheck && pnpm lint && pnpm test:run
pnpm test:e2e -- selected-toolbar-placement
```

**Review/commit gate**

- All tests green; placement E2E passes.
- Commit: `refactor(toolbar-placement): split selected-toolbar-placement into focused modules`

---

## Phase 3 — Single source of truth for keyboard shortcuts

**Goal:** eliminate the manual sync between use-keyboard-shortcuts.ts (47 dispatch entries) and keyboard-shortcuts-help.tsx (`SHORTCUT_SECTIONS` data).

**Files affected**

- New: `src/app/keyboard/keyboard-shortcuts.definitions.ts`
- Modified: use-keyboard-shortcuts.ts
- Modified: keyboard-shortcuts-help.tsx
- Possibly modified: use-keyboard-shortcuts.test.tsx, keyboard-shortcuts-help.test.tsx

**Step 3a — Extract definitions (do this first as its own commit)**

1. In `keyboard-shortcuts.definitions.ts`, define a pure data structure:
   ```ts
   export interface ShortcutMetadata {
     id: string
     match: KeyCombo | KeyCombo[]
     allowMatchInEditingTarget?: boolean
     requiresRoomViewFocus?: boolean
     requiresSelection?: boolean
     suppressionMode?: SuppressionMode
     // Help-rendering metadata:
     section: string
     group: string
     label: string
     comboLabels: string[][]   // human-readable, what SHORTCUT_SECTIONS encodes today
   }
   export const KEYBOARD_SHORTCUTS: readonly ShortcutMetadata[] = [...]
   ```
2. Populate by **mechanically merging** the existing dispatch entries with the help labels. For each entry:
   - The `match` value comes from the hook.
   - `section`/`group`/`label`/`comboLabels` come from `SHORTCUT_SECTIONS`.
   - Pair them by hand using `id` you assign (`'undo'`, `'redo'`, `'rotate-cw'`, `'move-x-pos'`, …). Use the existing `id` strings already in `ShortcutDefinition` where present.
3. Critical correctness check: produce a single output of `KEYBOARD_SHORTCUTS.map(s => ({ id, match }))` and compare against the original dispatch table. The set of `(id, match)` pairs must be identical.

**Step 3b — Refactor the hook to consume definitions**

1. `useKeyboardShortcuts` no longer hard-codes the 47 entries; it maps each `KEYBOARD_SHORTCUTS` entry to an executor via a small `id → callback` lookup built from `options`.
2. Verify dispatch precedence is preserved. Today the hook iterates a specific order (e.g. movement before canvas-browse for arrow keys when `hasSelection`). **Preserve that order in `KEYBOARD_SHORTCUTS`** — the array order is now a contract. Add a comment on the constant: `// Order matters: dispatch precedence is array order.`

**Step 3c — Refactor help dialog to derive sections**

1. Replace the hardcoded `SHORTCUT_SECTIONS` constant with a pure function `buildShortcutSections(KEYBOARD_SHORTCUTS)` that groups by `section` then `group`, preserving array order.
2. Result: keyboard-shortcuts-help.tsx becomes ~100 lines (rendering only).

**Test considerations**

- use-keyboard-shortcuts.test.tsx (538 lines) drives the hook by simulating key events; it should pass unchanged. **If any test asserts on internal `ShortcutDefinition` order indirectly (e.g. by triggering ambiguous keys), that's a contract test we must not break.** Re-run carefully.
- keyboard-shortcuts-help.test.tsx (84 lines) likely asserts visible groupings/labels. After 3c those assertions depend on `KEYBOARD_SHORTCUTS` data — make sure labels in the new constant match what the test expects character-for-character.
- Add (optional but recommended) a tiny unit test in `keyboard-shortcuts.definitions.test.ts` asserting **(a)** every `id` is unique and **(b)** the array length equals the count the snapshot test currently sees.
- E2E: editor-hotkeys.spec.ts and editor-accessibility-flows.spec.ts verify real keyboard behavior in the browser. **Run both** as a confidence check after this phase.

**Validation**

```
pnpm typecheck && pnpm lint && pnpm test:run
pnpm test:e2e -- editor-hotkeys
pnpm test:e2e -- editor-accessibility-flows
```

**Review/commit gate** — split into **two commits** for reviewability:

1. `refactor(keyboard): extract shortcut definitions to single source of truth`
2. `refactor(keyboard): derive shortcut help dialog from definitions`

**STOP HERE for a review checkpoint.** This is the most behavior-adjacent phase; pause for code review before continuing.

---

## Phase 4 — Trim use-dialog-state.ts (420 → ~250 lines)

**Strategy choice:** Use **Strategy A (helper extraction, behavior preserved)**, NOT a hook split. The 9 dialog kinds and `syncLayoutMode` are tightly coupled (mutual exclusion + return-focus remap). Splitting risks behavior drift; helper extraction is mechanical.

**Files affected**

- Modified: use-dialog-state.ts
- Possibly modified: use-dialog-state.test.ts (399 lines) — should not need changes if API is preserved.

**Plan**

1. Identify the ~7 repeated open/close patterns (catalog, delete, info, keyboard-shortcuts, mobile-more, start-over, room-surface — last two have variants).
2. Extract a **module-private** helper inside the same file:
   ```ts
   function makeDialogToggle<T extends ActiveDialog>(
     kind: T,
     getActive: () => ActiveDialog,
     setActive: (next: ActiveDialog) => void,
     setReturnTarget: (t: DialogReturnFocusTarget) => void,
     guard?: () => boolean,
   ): {
     open: (opts?: DialogOpenOptions) => boolean
     setOpen: (open: boolean, opts?: DialogOpenOptions) => boolean
   }
   ```
3. Keep `openCatalog` / `setCatalogOpen` etc. as thin wrappers over the helper, **so the public hook return type is byte-identical**.
4. **Leave `syncLayoutMode` and the room-surface variant logic untouched** — that code is the intricate part. Only mechanical dedup of the simple dialogs.
5. Public hook return shape (interface `DialogState`) **must not change**. Verify via `pnpm typecheck` against the rest of the app.

**Test considerations**

- use-dialog-state.test.ts is large (399 lines) and behavior-focused. If anything fails, it's almost certainly a real regression — do not "update the test to pass."
- Pay attention to focus-return behavior in tests; the helper must call `setReturnTarget` in the **same conditions** the original code did (specifically: only when the open call provides one).
- E2E: editor-dialogs.spec.ts (340 lines) is the integration safety net. **Run it.**

**Validation**

```
pnpm typecheck && pnpm lint && pnpm test:run
pnpm test:e2e -- editor-dialogs
pnpm test:e2e -- editor-accessibility
```

**Review/commit gate**

- Commit: `refactor(dialog-state): extract repeated open/close patterns into helper`

---

## Phase 5 — Small overlay cleanups (bundle of low-risk edits)

These can be one commit each or a single batched commit.

### 5a. Remove `RoomButton` indirection

- Delete room-button.tsx.
- Inline its `<Tooltip><Button>…</Button></Tooltip>` JSX into top-header-desktop.tsx and top-header-mobile.tsx (only 2 callers).
- Remove the import lines.
- **Tests:** no dedicated test for `RoomButton`. Existing top-header tests should pass unchanged.
- Commit: `refactor(overlay): inline RoomButton into top header variants`

### 5b. Extract `RoomSurfaceContent`

- New: `src/app/overlay/room-surface-content.tsx` exporting a body component that renders `<RoomControls />` plus the description block (currently duplicated in room-sidebar.tsx and room-drawer.tsx).
- The two outer wrappers (Card vs Drawer) keep their unique chrome (close button, ScrollArea, drawer modal mode) but consume the shared body.
- **Tests:** room-drawer.test.tsx (176 lines) — rendered DOM should be identical; no test changes expected. RoomSidebar lacks a dedicated test today; not adding one in this phase.
- Commit: `refactor(overlay): extract RoomSurfaceContent shared body`

### 5c. Dedup "open from mobile-more" callbacks

- In top-header.tsx, extract a local helper:
  ```ts
  const openDialogFromMore = (
    open: (opts?: DialogOpenOptions) => boolean,
    returnFocusTarget: DialogReturnFocusTarget,
  ) => {
    dialogs.onMobileMoreOpenChange(false)
    queueMicrotask(() => open({ returnFocusTarget }))
  }
  ```
- Use for keyboard, info, start-over triggers from the mobile-more drawer.
- **Tests:** `use-dialog-state.test.ts` covers underlying ordering; top-header tests cover wiring. The `queueMicrotask` timing must be preserved exactly — it's load-bearing for focus restoration. Verify via editor-accessibility-flows.spec.ts.
- Commit: `refactor(top-header): dedup open-from-mobile-more dialog pattern`

### 5d. Flatten `top-header.types.ts`

- Inline `TopHeaderCatalogProps`, `TopHeaderHistoryProps`, `TopHeaderDialogsProps`, `TopHeaderRoomProps` into the consumer interfaces (`TopHeaderProps`, `TopHeaderDesktopProps`, `TopHeaderMobileProps`).
- Verify no external file imports the now-removed sub-interfaces (`grep_search` for each name).
- **Tests:** type-only change. `pnpm typecheck` is the gate.
- Commit: `refactor(top-header): flatten props sub-interfaces`

**Validation after Phase 5**

```
pnpm typecheck && pnpm lint && pnpm test:run
pnpm test:e2e
```

This is the right point for a **full E2E run** because Phase 5 touches multiple overlay surfaces.

**Review/commit gate** — multiple small commits as listed above.

---

## Phase 6 — Hook composability: `useElementRect` ⊃ `useElementSize`

**Files affected**

- use-element-rect.ts
- use-element-size.ts
- use-element-rect.test.ts
- use-element-size.test.tsx

**Plan**

1. Add a callback-ref variant to use-element-rect.ts:
   ```ts
   export function useElementRectRef(): {
     ref: (el: HTMLElement | null) => void
     rect: DOMRectReadOnly | null
   }
   ```
   Keep the existing `useElementRect(ref: RefObject<...>)` signature **unchanged** — current callers continue to work.
2. Reduce use-element-size.ts to:
   ```ts
   export function useElementSize() {
     const { ref, rect } = useElementRectRef()
     return {
       ref,
       size: { width: rect?.width ?? 0, height: rect?.height ?? 0 },
     }
   }
   ```
3. The two hooks must observe **identical update semantics** as today:
   - ResizeObserver primary path
   - `window.resize` fallback when `ResizeObserver === undefined`
   - `useLayoutEffect` for sync measurement
   - Bailout when width/height unchanged (referential equality preserved)
   - The current `use-element-rect` also tracks scroll/viewport changes — `useElementSize` previously did **not**. Verify whether wrapping introduces new subscriptions; if so, gate them behind an option to preserve old behavior.

**⚠ Behavior-preservation pitfall**  
Compare the two hooks' subscription lists carefully before composing. If `useElementRect` listens to `scroll` while `useElementSize` historically did not, then `useElementSize` consumers would suddenly re-render on scroll. Two acceptable mitigations:

- Add `{ trackPosition?: boolean }` option to `useElementRectRef` (default `false`); `useElementSize` opts out, callers that want full rect opt in.
- Or, leave the implementations independent and skip Phase 6. **If in doubt, skip.**

**Test considerations**

- use-element-rect.test.ts (201 lines) exercises ResizeObserver, scroll, viewport. Existing tests should remain green for the original API.
- use-element-size.test.tsx (67 lines) — likely tests stable width/height bailout. Verify after refactor it still passes without changes.
- New coverage: add 1–2 tests for `useElementRectRef` (the new callback-ref variant): "calls measurement after mount" and "updates on resize".

**Validation**

```
pnpm typecheck && pnpm lint && pnpm test:run
```

No E2E impact expected. Skip E2E unless tests fail.

**Review/commit gate**

- Commit: `refactor(hooks): compose useElementSize on top of useElementRect`

---

## Phase 7 — Test fixture extraction (small, mostly mechanical)

**Files affected**

- New: `src/app/selection/test-fixtures.ts`
- Modified: selected-item-controls.test.tsx, selected-item-details.test.tsx, selected-toolbar-placement.test.ts — replace local copies of `FURNITURE_ITEM`, `createRect`, `MockResizeObserver`, `createRoomViewRef` with imports.

**Plan**

1. Audit each duplicate by name across the three test files. Confirm bodies are character-identical (or document any divergence and pick the canonical one — should be very close to identical based on the analysis).
2. If any divergence is intentional (e.g. one fixture has different dimensions), keep both with distinct names; do not silently merge.
3. Update imports.

**Test considerations** — only test code changes; no production impact. `pnpm test:run` is the only gate.

**Commit:** `test(selection): extract shared fixtures for selection test suites`

---

## Phase 8 — Polish (optional, time-permitting)

Discrete, independent, each its own small commit.

### 8a. Magic-constant comments

File: selected-toolbar-placement.ts lines ~67–88. Add 1–2 line `//` comments above each tuning constant explaining its UX intent (`SUPPORT_BAND_TOLERANCE`, `DIAGONAL_SIDE_BIAS_TOP_PENALTY`, `MAX_FLOATING_SCORE`, etc.). Also document the inline `48 -` constant in `scoreCandidate` (lift it into a named constant or comment it). **No logic change.**

### 8b. Naming consistency on mobile-more drawer

Pick `mobileMoreDrawer` or `headerMoreActionsDrawer` and apply consistently across:

- `ActiveDialog` literal `'more-mobile'`
- `isMobileMoreOpen` / `onMobileMoreOpenChange`
- File header-more-actions-drawer.tsx

This is a rename across ~5–8 sites. Use VS Code rename symbol where possible. **Tests:** type/symbol rename only — `pnpm typecheck` is sufficient.

### 8c. Document `use-overlay-props.ts`

Add a header comment to use-overlay-props.ts stating it is a pure props-organization layer with no side effects, listing the bundles it returns.

### 8d. Documentation alignment

- keyboard-shortcuts.md: if Phase 3 lands, add a note that shortcut metadata is now sourced from `keyboard-shortcuts.definitions.ts`; help dialog auto-syncs.
- The "Selected-item Placement panel" section in keyboard-shortcuts.md may move to a placement-focused doc — coordinate with author intent before moving.

**Validation:** `pnpm lint && pnpm typecheck && pnpm test:run`. No E2E.

---

## Final gate before merging `ui` → `main`

After the last applied phase:

```
pnpm install
pnpm fix                  # apply lint+format
pnpm typecheck
pnpm lint
pnpm test:run
pnpm test:e2e
```

Manual sanity checks (do not script):

1. Open the dev server (`pnpm dev`) on desktop viewport: select a furniture item, observe floating toolbar placement in 4 camera presets. Verify identical to pre-cleanup behavior.
2. Resize to mobile viewport; open mobile-more drawer; open keyboard / info / start-over from inside it; verify focus returns to the mobile-more trigger after each closes.
3. Open the keyboard shortcuts help dialog; spot-check three sections against editor-shortcuts-reference.md.

If all three are clean → merge.

---

## Risk summary by phase

| Phase                    | Behavior risk                   | Test risk              | E2E risk                        | Reviewability                 |
| ------------------------ | ------------------------------- | ---------------------- | ------------------------------- | ----------------------------- |
| 1 — split handlers test  | none                            | medium (mock hoisting) | none                            | high                          |
| 2 — split placement.ts   | very low                        | low                    | low (run placement E2E)         | high                          |
| 3 — keyboard SoT         | medium (dispatch order)         | medium                 | medium (run hotkeys + a11y E2E) | medium — split into 2 commits |
| 4 — dialog-state helper  | medium (focus return)           | medium                 | medium (run dialogs + a11y E2E) | medium                        |
| 5a–5d — overlay cleanups | low                             | low                    | low (full E2E run)              | high (4 small commits)        |
| 6 — hook composition     | low–medium (subscription scope) | low                    | none                            | high — skip if uncertain      |
| 7 — test fixtures        | none                            | very low               | none                            | high                          |
| 8 — polish               | none                            | none                   | none                            | high                          |

## Recommended commit cadence

```
chore(baseline): record pre-cleanup test baseline      (Phase 0 — note only)
test(scene-handlers): split use-scene-handlers tests   (Phase 1)
                                                       — REVIEW —
refactor(toolbar-placement): split into focused mods   (Phase 2)
                                                       — REVIEW —
refactor(keyboard): extract shortcut definitions       (Phase 3a)
refactor(keyboard): derive help dialog from defs       (Phase 3b)
                                                       — REVIEW —
refactor(dialog-state): extract open/close helper      (Phase 4)
                                                       — REVIEW —
refactor(overlay): inline RoomButton                   (Phase 5a)
refactor(overlay): extract RoomSurfaceContent          (Phase 5b)
refactor(top-header): dedup open-from-mobile-more      (Phase 5c)
refactor(top-header): flatten props sub-interfaces     (Phase 5d)
                                                       — REVIEW + FULL E2E —
refactor(hooks): compose useElementSize on rect hook   (Phase 6, optional)
test(selection): extract shared fixtures               (Phase 7)
docs/polish commits                                    (Phase 8)
                                                       — FINAL REVIEW —
                                                       — MERGE —
```
