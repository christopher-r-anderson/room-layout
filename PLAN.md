# Project Plan

## Goal

Deliver a small, polished 3D room-layout editor demo that demonstrates production-minded interaction design, clean architecture, and shareable state.

## Scope Guardrails

- Prioritize end-to-end quality over feature count.
- Keep interactions consistent across mouse and keyboard.
- Favor simple, maintainable implementations over heavy abstractions.
- Keep URL sharing basic but reliable for this cycle.
- Keep multi-object editing as stretch unless core single-object flows are fully polished.

## Progress Checklist

### Foundation and Scene Setup

- [x] Replace starter app with room scene and camera controls.
- [x] Load GLTF furniture assets and render initial catalog items.
- [x] Add object selection with visual outline feedback.

### Core Editor Interactions

- [x] Add floor-constrained movement with pointer capture.
- [x] Add room bounds clamping and grid snapping during movement.
- [x] Disable camera controls while actively moving an item.
- [x] Add selected-item rotation (keyboard and overlay controls).
- [x] Fix armchair pivot/origin in source asset and exported GLB.

### Code Quality and Conventions

- [x] Add/maintain utility tests for core Three/math behavior.
- [x] Add test coverage for rotation hotkey routing logic.
- [x] Shift naming to semantic interaction terms (`InteractiveFurniture`, move callbacks).
- [x] Add visible workspace guidance in `AGENTS.md`.

### Must-Have Next Work

- [x] Add collision prevention so furniture cannot overlap.
- [x] Add wall/edge snapping behavior that works with collisions.
- [ ] Set up Playwright browser performance harness for scripted interaction scenarios.
- [ ] Add baseline browser perf scenario for drag/rotate/collision interaction traces.
- [ ] Expand furniture catalog to 4 total types (including coffee table and end table).
- [x] Add UI flow to insert furniture instances on demand.
- [x] Add remove-selected-item action.
- [x] Add undo/redo for move, rotate, add, and remove actions.
- [ ] Add hover affordance (subtle outline/highlight) for discoverability.
- [ ] Ensure all primary interactions are keyboard reachable.

### Camera and Visual Polish (Core)

- [ ] Add camera presets with smooth transitions (for example: isometric, top, doorway).
- [ ] Add environment lighting polish (HDRI or equivalent image-based lighting).
- [ ] Improve shadow quality and consistency without hurting responsiveness.

### Loading and Resilience (Core)

- [x] Add startup loading overlay with clear progress feedback.
- [x] Disable editor interactions until essential scene assets are ready.
- [x] Add graceful asset-load error state with retry action.
- [x] Preload current core furniture assets on app startup.

### Shareable State

- [ ] Serialize scene state (item kind, position, rotation) into URL.
- [ ] Load scene state from URL on initial app load.
- [ ] Handle invalid or missing URL state safely.

### Stretch Goals (Deliver If Core Is Stable)

- [ ] Add multi-object selection.
- [ ] Add multi-object manipulation for move/rotate.
- [ ] Add marquee or modifier-key multi-select affordance.
- [ ] Add optional alignment/distribution helpers for multi-select.

### Demo Polish and Delivery

- [x] Refresh README product section and include current feature list.
- [x] Add short usage guide (select, move, rotate, add, remove, share).
- [x] Run final validation pass (`pnpm fix`, `pnpm typecheck`, `pnpm test:run`, `pnpm build`).
- [ ] Capture demo media for README.

## Current Focus

1. Basic URL share/load.
2. Camera presets and visual polish.
3. Expanded furniture catalog coverage.
4. Browser performance harness.
5. Keyboard reachability polish.
