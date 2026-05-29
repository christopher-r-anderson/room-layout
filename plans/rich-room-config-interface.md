## Plan: Room Surface UX Refresh

Replace the current Environment modal/drawer + select controls with a dedicated consumer-facing Room surface: a non-modal right sidebar on desktop and a non-modal bottom sheet on mobile, both using swatch/thumbnail grids and preserving scene visibility while styling. The implementation should introduce an explicit blocking-overlay policy separate from Room-open state, keep Room open across desktop/mobile breakpoint transitions while swapping shell/layout, reuse the shared drawer with `modal={false}` on mobile, and keep future Lighting scope UI-only rather than widening runtime environment contracts now.

**Steps**

1. Phase 1: Lock product decisions, trigger semantics, and asset contract.
   Decide the user-facing label as `Room` for the trigger and panel title, while keeping existing `environment` code/types until a later cleanup. Treat `Walls`, `Floor`, and a future `Lighting` section as the stable top-level UI structure. Update trigger semantics and labels so the old dialog-oriented Environment affordance does not survive into the new non-modal surface.
2. Phase 1: Add environment preview metadata end-to-end. _Blocks step 11._
   Add optional `previewPath` for floor finishes across manifest parsing/validation, runtime types, schema docs, manifest data, and manifest tests. This explicitly includes updating `public/catalog-manifest.json` so each floor finish points at its preview asset path during implementation, including temporary placeholder files if those are used before final art is ready. Keep wall swatches derived directly from the wall `color` value.
3. Phase 1: Specify thumbnail/swatch assets.
   Use one app-facing preview asset per finish option. Recommended export spec: WebP, sRGB, 8-bit, 4:3 aspect ratio, 640x480 source size, visually cropped for material legibility, target under roughly 60 KB each when practical. Floor previews should show enough texture repeat to read the material. Wall finishes can use generated color swatches in the UI for v1, with optional matching preview tiles later. Use `public/environment/previews/` as the environment preview directory and name preview files by finish id, for example `environment/previews/wood-floor.webp`, `environment/previews/laminate-floor.webp`, `environment/previews/granite-tile.webp`, and `environment/previews/concrete-floor.webp`. If implementation-time placeholder assets are created before final art is ready, use those exact filenames so the user can replace them in place before commit.
4. Phase 1: Decide breakpoint persistence and focus contracts up front. _Blocks steps 6-9._
   Keep Room open across mobile/desktop transitions instead of inheriting the current auto-close Environment dialog behavior. Define how the open Room surface swaps shell/layout at the breakpoint, how focus is preserved when the surface stays open during the transition, and where focus returns when the user closes Room from desktop or mobile now that mobile no longer launches it from More.
5. Phase 2: Replace the modal catch-all with explicit Room-open and blocking-overlay concepts. _Blocks steps 6-9._
   Refactor overlay state so Room is no longer represented as an `ActiveDialog` variant and no longer piggybacks on the current catch-all modal flag. Introduce a separate Room surface state such as `isRoomSurfaceOpen` plus `roomSurfaceLayout`, and derive a blocking-overlay signal for true modal overlays only. Keep Room mutually exclusive with every other top-level dialog/drawer/modal: opening catalog, delete, keyboard shortcuts, info, start over, mobile more, or any other top-level overlay should explicitly close Room first and then open the requested overlay, rather than relying on open helpers to race against an already-open Room state.
6. Phase 2: Propagate the blocking-overlay policy to every existing modal consumer. _Depends on 5._
   Update all current `isModalOpen`-driven behavior, not just `sceneInteractionsDisabled` in `App.tsx`. That includes outliner focus handoff in `use-scene-sync.ts`, preview suppression and preview clearing in `use-preview-state.ts` and `use-preview-controller.ts`, keyboard shortcut suppression in `use-keyboard-shortcuts.ts`, and held camera-key clearing in `use-camera-key-state.ts`. Room-open should not inherit the current blocking-overlay behavior.
7. Phase 3: Build the desktop Room sidebar. _Depends on 4-6._
   Implement a dedicated non-modal right-side panel inside the overlay shell instead of reusing Dialog. The panel should be toggleable from the existing header trigger, stay open while users interact with the scene, and support explicit close and Escape handling. Keep the camera tools in the same DOM order and reuse a UI-only `Lighting` placeholder structure without adding lighting runtime contracts.
8. Phase 3: Adapt desktop camera controls to coexist with the sidebar. _Depends on 7._
   Keep camera controls on the right side, but when the Room sidebar is open, re-anchor the camera rail to the left edge of the sidebar with a consistent gap and switch it to a compact icon-first treatment using the existing ToolButton label visibility support. Do not move camera controls to the left side of the app; the left side is already owned by the outliner and scene-management surfaces.
9. Phase 4: Treat the mobile Room sheet as a shared-drawer API change. _Depends on 4-6._
   Surface Room directly in the mobile header rather than hiding it behind More. Expose the shared drawer `modal` prop in `drawer.tsx`, default it to `true`, and open Room with `modal={false}` so the scene remains visible and interactive without changing catalog or More behavior. Validate the observed non-obscuring/non-blocking behavior with targeted tests before locking the implementation.
10. Phase 4: Adapt mobile camera access while the Room sheet is open. _Depends on 9._
    Do not keep the existing right-center floating camera rail in place while the bottom sheet is open, because it will visually and physically compete for the same space. Instead, expose a condensed camera/view control inside the Room sheet header or pinned just above the sheet edge, so preset changes remain available without stacking overlapping floating controls.
11. Phase 5: Replace selects with accessible visual option grids. _Depends on 2, 7, and 9. Parallelizable by section after the surface shells exist._
    Replace the current Environment selects with accessible radio-grid cards and swatches that reuse the catalog preview-card pattern. Floor finishes should render thumbnail cards with label + selected state. Wall finishes should render paint-chip style swatches with readable labels and selected state. Ensure keyboard navigation, focus rings, and loading feedback for floor texture changes are preserved.
12. Phase 5: Future-proof for Lighting at the UI layer only. _Parallel with 11 once panel structure exists._
    Reserve the Lighting tab/segment and shared card layout structure in the UI, but do not add lighting placeholders to `environment-materials.ts` or widen manifest/runtime environment contracts in this work.
13. Phase 6: Update tests and verification coverage. _Depends on all implementation phases._
    Update existing focus-return, mobile-order, keyboard, preview, and dialog-flow tests in addition to adding new coverage for desktop sidebar behavior, mobile Room sheet behavior, camera availability while Room is open, and the new blocking-overlay policy.

**Interaction Matrix**

- `Non-blocking companion surface open` — default policy for Room: do not change editor behavior outside the surface. Scene visibility, canvas pointer interaction outside the surface, camera tools, camera shortcuts subject to existing focus rules, outliner focus handoff, preview visibility, and non-text-input shortcuts remain available.
- `Non-blocking companion surface open` — only local constraints apply: pointer events inside the surface do not reach the canvas, focus inside Room controls follows normal input/editing rules, and the surface does not auto-close on outside click.
- `Opening any other top-level dialog/drawer/modal while Room is open` — close Room first, then open the requested overlay. Room remains a non-blocking companion surface, but it is not allowed to coexist with other top-level overlays.
- `Blocking overlay open` — preserve the current blocking behavior for true modal surfaces: suppress scene interaction, suppress outliner focus handoff, suppress preview visibility/clear pending preview state, suppress shortcuts, and clear held camera keys where current behavior already depends on the blocking flag.
- `Overlay class policy` — avoid per-surface custom allow/block mixes. Future overlays should be classified as either `blocking overlay` or `non-blocking companion surface`; Room follows the non-blocking policy but stays mutually exclusive with other top-level overlays unless a later product decision explicitly changes that rule.
- `Breakpoint transition while Room is open` — keep Room open, swap desktop/mobile shell, preserve intent continuity, and define focus behavior explicitly instead of inheriting the current Environment auto-close path.
- `Breakpoint transition while blocking overlay is open` — keep current modal-specific responsive behavior unless there is a deliberate reason to change it; this work should not broaden Room exceptions to unrelated overlays.

**Documentation**

1. Add a durable developer-facing overlay interaction doc under `docs/` describing the two overlay classes: blocking overlays vs the non-blocking Room surface. It should explain what each class suppresses, why, how focus behaves, how breakpoint persistence works, and how future overlays should be classified.
2. Update `docs/keyboard-shortcuts.md` so `isModalOpen` is no longer documented as the universal blocker. Replace that with the new blocking-overlay policy and call out the non-blocking Room exception.
3. Update `README.md` where it currently describes the Environment dialog and manifest-driven environment options so it reflects the Room surface and the new environment preview assets workflow.
4. Update `public/catalog-manifest-schema.md` for floor `previewPath` and expand the manifest/asset guidance to cover environment preview images alongside existing furniture preview images.
5. Update any existing plan docs that are still actively used as architecture references only if they would otherwise contradict the new blocking-overlay model. I do not recommend rewriting old historical plans as the primary durable documentation source; the new `docs/` architecture note should become the source of truth.

**Component Acquisition**

1. Add `Tabs` explicitly as a planned shadcn starter component because the project does not currently have a tabs or segmented-navigation primitive. Use `pnpm dlx shadcn@latest docs tabs` first, then `pnpm dlx shadcn@latest add tabs` if the implementation keeps the tabbed Walls/Floor/Lighting structure.
2. Reuse existing `Card`, `Drawer`, `Button`, `ScrollArea`, and native radio semantics for the finish grids rather than adding more new primitives by default.
3. Do not add a new ToggleGroup primitive for the section switch unless design or accessibility review shows Tabs are the wrong abstraction. For switching between content panels (`Walls`, `Floor`, `Lighting`), Tabs remain the better fit than ToggleGroup.

**Relevant files**

- `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.ts` — split blocking-overlay state from Room-open state, preserve true-dialog return-focus contracts, and replace Environment-specific auto-close-on-layout-switch behavior with explicit Room breakpoint persistence logic.
- `/home/splict/src/room-layout/src/App.tsx` — replace broad modal-state consumers with the new blocking-overlay policy and pass Room-surface props through the overlay shell.
- `/home/splict/src/room-layout/src/app/hooks/use-scene-sync.ts` — stop coupling outliner focus handoff to Room-open state; keep it gated only by blocking overlays.
- `/home/splict/src/room-layout/src/app/overlay/use-preview-state.ts` — stop suppressing preview visibility just because Room is open.
- `/home/splict/src/room-layout/src/app/use-preview-controller.ts` — stop clearing preview state just because the Room surface is open.
- `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.ts` — refine shortcut suppression so Room-open does not act like a fully blocking overlay.
- `/home/splict/src/room-layout/src/app/keyboard/use-camera-key-state.ts` — allow camera preset/motion exceptions when Room is open if the focus context permits it and keep held-key clearing scoped to blocking overlays.
- `/home/splict/src/room-layout/src/app/overlay/editor-overlay.tsx` — host the desktop Room sidebar and reposition the camera rail relative to panel state while preserving current DOM-order constraints.
- `/home/splict/src/room-layout/src/app/camera/camera-tools.tsx` — add compact/open-state variants using existing ToolButton label visibility and sizing support.
- `/home/splict/src/room-layout/src/components/ui/tool-button.tsx` — reuse existing `labelVisibility` support for compact camera presentation if the camera-rail variant needs it.
- `/home/splict/src/room-layout/src/components/ui/tabs.tsx` — add the shadcn Tabs starter component if the Walls/Floor/Lighting section switch remains tabbed.
- `/home/splict/src/room-layout/src/app/overlay/top-header.tsx` — update responsive trigger orchestration, direct mobile Room access, breakpoint-persistence behavior, and close-time focus return.
- `/home/splict/src/room-layout/src/app/overlay/top-header-desktop.tsx` — change the Environment trigger to the Room trigger and route it to the desktop sidebar toggle instead of Dialog.
- `/home/splict/src/room-layout/src/app/overlay/top-header-mobile.tsx` — surface Room directly in the mobile header and intentionally update the narrow-screen order from the current `Add Furniture -> Undo -> Redo -> Share -> More` flow to the new `Add Furniture -> Room -> Undo -> Redo -> More` contract, with Share moved into More and the related Playwright expectations updated deliberately.
- `/home/splict/src/room-layout/src/app/overlay/room-button.tsx` — update trigger naming and ARIA semantics so it no longer announces dialog behavior or Environment naming.
- `/home/splict/src/room-layout/src/app/overlay/environment-dialog.tsx` — likely retire or narrow in scope once desktop stops using a modal.
- `/home/splict/src/room-layout/src/app/overlay/room-drawer.tsx` — adapt the existing mobile Environment surface into the Room sheet and pass `modal={false}` through the Room-specific path.
- `/home/splict/src/room-layout/src/app/overlay/environment-panel.tsx` — replace form selects with accessible Walls/Floor radio-grid cards and UI-only Lighting placeholder structure.
- `/home/splict/src/room-layout/src/app/catalog/catalog-drawer.tsx` — reuse the preview-card/grid pattern for finish option presentation.
- `/home/splict/src/room-layout/src/components/ui/drawer.tsx` — keep the shared Drawer wrapper stable unless an explicit wrapper default or wrapper-level tests are needed; the key Room change is using the already-forwarded Vaul `modal` prop through the Room path.
- `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.ts` — update derived header/overlay prop wiring if Room-open and blocking-overlay-open become separate inputs.
- `/home/splict/src/room-layout/public/environment/previews/` — add floor-finish preview assets (or temporary placeholders during implementation) using finish-id-based filenames such as `wood-floor.webp`, `laminate-floor.webp`, `granite-tile.webp`, and `concrete-floor.webp`.

- `/home/splict/src/room-layout/src/app/overlay/top-header.types.ts` — update the header prop surface for Room state, mutual-exclusion actions, and revised mobile trigger semantics.
- `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.test.ts` — add/update coverage for Room state, mutual-exclusion behavior, and explicit close-then-open orchestration.
- `/home/splict/src/room-layout/public/catalog-manifest.json` — add preview metadata for floor/wall finishes.
- `/home/splict/src/room-layout/src/app/startup/catalog-manifest.ts` — validate/normalize floor `previewPath` metadata and keep wall swatches color-driven.
- `/home/splict/src/room-layout/src/lib/three/environment-materials.ts` — extend floor/wall finish option types with preview metadata only; do not add Lighting runtime placeholders in this work.
- `/home/splict/src/room-layout/public/catalog-manifest-schema.md` — document floor/wall preview metadata and keep Lighting out of the runtime schema for now.
- `/home/splict/src/room-layout/src/app/startup/catalog-manifest.test.ts` — add parser/validation coverage for floor/wall preview metadata.
- `/home/splict/src/room-layout/src/app/hooks/use-scene-sync.test.ts` — update focus-handoff coverage for the new blocking-overlay policy.
- `/home/splict/src/room-layout/src/app/overlay/use-preview-state.test.ts` — update preview-visibility coverage so Room-open no longer behaves like a blocking overlay.
- `/home/splict/src/room-layout/src/app/overlay/editor-overlay.test.tsx` and `/home/splict/src/room-layout/src/app/keyboard/*.test.tsx` — update unit/integration coverage for new surface semantics and shortcut policy.
- `/home/splict/src/room-layout/docs/overlay-interaction-model.md` — add a durable developer-facing explanation of blocking overlays vs the non-blocking Room surface, including focus, shortcut, preview, and breakpoint behavior.
- `/home/splict/src/room-layout/docs/keyboard-shortcuts.md` — replace the current universal `isModalOpen` documentation with the new blocking-overlay policy and Room exception.
- `/home/splict/src/room-layout/README.md` — update user-facing references from Environment dialog to Room surface and expand asset/manifest workflow notes for environment preview images.

- `/home/splict/src/room-layout/e2e/editor-dialogs.spec.ts`, `/home/splict/src/room-layout/e2e/editor-accessibility-flows.spec.ts`, and a new Room-surface-focused spec — validate responsive behavior, accessibility, focus return, and non-modal interaction.

**Verification**

1. Add unit tests proving Room-open is distinct from blocking-overlay-open and that the blocking signal, not Room-open, drives scene interaction gating, outliner focus handoff, preview suppression/clearing, shortcut suppression, and held camera-key clearing.
2. Add integration tests proving desktop sidebar toggle behavior, mobile direct Room trigger behavior, the new narrow-screen order `Add Furniture -> Room -> Undo -> Redo -> More`, breakpoint persistence across layout changes, close-time focus return now that mobile no longer launches Room from More, and the rule that opening any other top-level overlay closes Room first.
3. Add parser/schema tests for floor `previewPath` support in the manifest and runtime environment types.
4. Add Playwright tests for desktop: open Room, change wall/floor visually while scene remains visible, use camera preset controls while Room remains open, verify outside scene clicks do not close the sidebar, and verify opening another top-level overlay closes Room.
5. Add Playwright tests for mobile: open Room from the header, verify the non-modal sheet behavior, verify outside scene interaction remains available, verify breakpoint transition behavior, verify condensed camera access remains usable, and verify opening another top-level overlay closes Room.
6. Re-run existing accessibility and dialog-flow coverage that enforces header order, focus behavior, and current overlay contracts.
7. Run `pnpm test:run`, the targeted Playwright specs, `pnpm lint`, `pnpm typecheck`, and `pnpm fix` before completion.

**Decisions**

- Desktop recommendation: keep the Room surface on the right, not the left. The left side already has the outliner and selection-adjacent surfaces; changing the camera controls is the lower-risk adaptation.
- Breakpoint recommendation: keep Room open across mobile/desktop transitions and swap shell/layout instead of inheriting the current Environment auto-close behavior. This is the better continuity model once mobile gets a direct Room trigger instead of the More path.
- State-policy recommendation: replace the current modal catch-all with a distinct blocking-overlay policy plus separate Room-open state, and propagate that blocking signal to every current modal consumer rather than only to `App.tsx`.
- Mobile recommendation: do not attempt to preserve the current floating right-center camera rail unchanged while the Room sheet is open. Use a condensed view-control pattern attached to the sheet instead.
- Naming recommendation: use `Room` for the user-facing trigger/title because it comfortably covers Walls, Floor, and Lighting for consumers. Keep `environment` as an internal implementation term for now to avoid unnecessary code churn.
- Complexity recommendation: do not implement a per-feature allow/block matrix for Room. The target model is two overlay classes only, with local input/focus rules and explicit mutual-exclusion rules where needed; future non-modal surfaces should default to the same non-blocking companion-surface policy unless there is a strong, documented reason to diverge.
- Mutual-exclusion recommendation: keep Room mutually exclusive with every other top-level dialog/drawer/modal. Opening another top-level overlay should close Room first; if a concrete product need appears later, revisit that rule explicitly instead of pre-optimizing for overlap now.
- Dismissal recommendation: Room should be non-modal on mobile, and the implementation should rely on the observed `modal={false}` behavior first rather than adding `dismissible={false}` unless targeted tests reveal accidental close paths that matter in practice.
- Mobile primitive recommendation: reuse the shared `src/components/ui/drawer.tsx` for Room by exposing `modal` and defaulting it to `true`; Room uses `modal={false}` while existing drawers keep current behavior.
- Lighting-scope recommendation: keep Lighting future-proofing at the UI layer only for this work; do not widen `environment-materials.ts`, the manifest schema, or runtime environment contracts with Lighting placeholders yet.
- Scope included: trigger/container/presentation refresh, interaction-policy refactor, camera coexistence planning, finish preview metadata, breakpoint/focus contract updates, and tests.
- Scope excluded: lighting scene logic, scene-level lighting presets, renaming all internal `environment` code, and broad unrelated overlay redesign.

**Further Considerations**

1. Add targeted tests around shared-drawer `modal={false}` behavior so the Room flow does not accidentally regress existing modal drawers or rely on unverified assumptions about overlay/dismissal behavior.
2. If user testing shows the default non-modal drawer behavior still dismisses too easily in real use, add `dismissible={false}` only for Room rather than broadening that policy globally.
3. If future lighting becomes substantially more complex than simple presets, keep it in the Room surface as a first-level tab and add advanced controls within that tab rather than splitting it into a separate global surface.
