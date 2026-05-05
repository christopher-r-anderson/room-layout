# Project Guidelines

## Build and Test

- Install deps with `pnpm install`.
- Run dev server with `pnpm dev`.
- Validate code with `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`.
- Run browser integration coverage with `pnpm test:e2e` when changing browser-facing editor flows, startup/loading behavior, or scene interaction wiring.
- Run browser perf trace scenarios with `pnpm test:browser:perf` when changing frame-sensitive user flows.
- Before finalizing code changes, run `pnpm fix` to apply lint+format fixes.
- For perf-sensitive utility changes, use `pnpm bench` (or `pnpm bench:json` / `pnpm bench:compare`).

### Library Documentation

- Use shadcn for ui and ui components. Add components from the default registry as needed.
- Always use Context7 when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
- use the context7 /tailwindlabs/tailwindcss.com v4 for documentation when using tailwind

## Architecture

- Keep scene/domain behavior in `src/scene/` and keep pure math/Three helpers in `src/lib/three/`.
- Keep utility modules in `src/lib/three/` and `src/lib/ui/` framework-agnostic and testable.
- Treat `src/scene/objects/furniture-catalog.ts` as the single source of truth for model paths and node names.
- Keep `src/App.tsx` focused on app-shell concerns (overlay controls, keyboard wiring) and pass intent to `Scene` via a minimal API.

### Structural invariants

**One-way dependency direction.**
`src/app` may import from `src/scene`; `src/scene` must never import from `src/app`. This is enforced as an ESLint error. Any import from `@/app` inside `src/scene` is a hard violation.

**Scene contracts vs. scene internals.**
Scene contracts are types and values that form the stable API between the scene domain and the app shell: `SceneRef`, `SceneReadModel`, `MoveSelectionResult`, `MoveSource`, `SelectByIdResult`, `FurnitureItem`, `FootprintSize`. App-side code must import scene contracts only from the three explicit approved modules — no barrel imports required:

- `@/scene/scene.types` — `SceneRef`, `SceneReadModel`, `MoveSelectionResult`, `MoveSource`, `SelectByIdResult`
- `@/scene/objects/furniture.types` — `FurnitureItem`, `FootprintSize`
- `@/scene/objects/furniture-catalog` — `FURNITURE_CATALOG` and preload/cache helpers (implementation/data allowed by policy)

Scene internals (utilities, state management, internal hooks) are organized in `src/scene/internal/` and must not be imported from app-side code. Attempting to import from `@/scene/internal/**` is enforced as an ESLint error. The one necessary exception is `src/App.tsx` importing the `Scene` component via relative path (`./scene/scene`) as the composition root — this is not caught by the `@/scene/` lint pattern and is intentional.

**Hook locality.**
Feature-local hooks belong in their feature folder (e.g. `src/app/overlay/use-overlay-state.ts`). Cross-cutting hooks that serve multiple features belong in `src/app/hooks/`. App-composition coordinator hooks (`use-startup-lifecycle.ts`, `use-scene-handlers.ts`) live flat in `src/app/` and are consumed only by `App.tsx`.

**Shared type placement.**
Types consumed by more than one layer (e.g. a feature folder and `hooks/`) belong at `src/app/` root as standalone `.types.ts` files (e.g. `scene-panel.types.ts`), not inside any single consumer folder.

## Conventions

- Prefer object-level pointer event handling with pointer capture for object movement interactions.
- Always release pointer capture on pointer up/cancel paths.
- Reuse Three.js scratch objects in hot paths (drag math) to avoid unnecessary allocations.
- Use the `@/` path alias for source imports.
- Use semantic interaction naming (for example, `InteractiveFurniture`, `onMoveStart`) over narrow gesture-specific names unless behavior is truly gesture-specific.
- Prefer fixing asset/data contract issues at the source (pivot, footprint metadata, node naming) over app-side compensation logic.
- Add app-side workarounds only when production constraints require them (for example: third-party assets, legacy interfaces, or external platform limits), and keep them explicit, minimal, and easy to remove.
- If it is unclear whether a workaround is pipeline-appropriate, pause and ask the user before implementing it.

## Testing

- Add or update Vitest tests for new behavior in pure utility modules.
- Prefer behavior/contract-oriented assertions over implementation-detail assertions.
- For geometry, transform, and other floating-point-derived values, prefer tolerant assertions like `toBeCloseTo` over exact equality unless exact integers are the product contract.
- Avoid over-testing tunable constants unless they are intentional product contracts.
- Use Playwright browser tests for startup/loading flows, retry/error handling, editor history flows, and other browser-realistic interaction coverage.
- When changing accessibility semantics, focus management, or announcements, run `e2e/editor-a11y-audits.spec.ts` in Chromium and keep it out of the perf lane.
- Keep browser perf trace scenarios in Playwright separate from correctness-oriented browser tests.
- Prefer trace capture and scripted browser scenarios over Playwright runner timing output when evaluating real interaction flows.
- For pure utility hot paths, use Vitest benchmark files (`*.bench.ts`) and compare against saved baselines (`pnpm bench:json`, `pnpm bench:compare`).
- For user-flow performance decisions (drag, rotate, collision, camera transitions), use Playwright-driven browser benchmarks with scripted interactions and trace capture.
- Use browser benchmarks when implementation options affect frame-time-sensitive interactions or when microbench results are not sufficient to choose an approach.
- Keep performance optimizations only when measured results justify the added complexity.

## Testing Strategy for React Three Fiber

This project uses a 3-tier testing architecture to balance test speed, coverage, and confidence:

### Tier 1: Unit Tests (Vitest + Node.js)

- **What:** Pure utilities, pure React hooks (no scene dependencies)
- **Tools:** Vitest with `environment: 'node'`
- **Examples:**
  - Geometry math: `src/lib/three/furniture-drag.test.ts`
  - Hotkey logic: `src/lib/ui/delete-hotkeys.test.ts`
  - App state hooks: `src/app/use-editor-dialog-state.test.ts`
- **Speed:** <50ms per test
- **Coverage:** ~90% of codebase
- **When to use:** "Is this pure logic with no 3D rendering or browser-specific behavior?"

### Tier 1.5: Integration Tests (Vitest + RTTR + jsdom)

- **What:** React Three Fiber components, scene composition, event dispatch sequencing
- **Tools:** Vitest with `@vitest-environment jsdom` + `@react-three/test-renderer`
- **Examples:**
  - Component structure: `src/scene/internal/objects/interactive-furniture.test.tsx`
  - Event handler wiring: `src/scene/internal/objects/interactive-furniture.event.test.tsx`
  - Hook initialization: `src/scene/internal/use-scene-imperative-api.test.ts`
- **Speed:** <200ms per test
- **Coverage:** ~5-10% of codebase (fills R3F component gaps)
- **When to use:** "Does this test component render, event dispatch, or initialization?"
- **Limitations:** RTTR cannot populate `event.ray` or pointer-capture-dependent geometry (drag, collision). Use Playwright E2E for those behaviors.
- **Important:** Don't use RTTR for pointer event results (collision detection, ray casting); use Playwright for that.

### Tier 2: E2E Tests (Playwright + Real Browser)

- **What:** Multi-step user workflows, real WebGL rendering, asset loading, visual validation
- **Tools:** Playwright with Chromium
- **Examples:**
  - Drag + collision detection: `e2e/drag-collision.spec.ts`
  - Undo/redo with visual confirmation: `e2e/editor-history.spec.ts`
  - Asset loading and error recovery: `e2e/startup-loading.spec.ts`
- **Speed:** <5s per test
- **Coverage:** ~5-10% of codebase (critical workflows only)
- **When to use:** "Does this require real browser rendering, asset loading, or visual confirmation?"

### Key Principles

1. **Don't over-test:** If a behavior is tested in Tier 1 or 1.5, don't duplicate it in E2E.
2. **Avoid jsdom for canvas:** Tier 1.5 uses jsdom for component structure and event dispatch, but real pointer event validation (raycasting, collision) happens in E2E.
3. **Use tolerant assertions for geometry:** Floating-point values use `toBeCloseTo()`, not exact equality.
4. **Test frame-dependent logic with `advanceFrames()`:** In Tier 1.5, use RTTR's frame advancement to test `useFrame` effects.

### Test Commands

- `pnpm test:run` - All Tier 1 + 1.5 tests (Vitest)
- `pnpm test:e2e` - All Tier 2 tests (Playwright)
- `pnpm test:browser:perf` - Performance traces (separate Playwright project)
- `pnpm bench` - Hot-path benchmarks (utilities only)

### RTTR Patterns (Tier 1.5)

#### Rendering a component

```typescript
import { createR3FTestScene } from '@/test/r3f-renderer'

test('renders mesh with correct geometry', async () => {
  const renderer = await createR3FTestScene(
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={0xff0000} />
    </mesh>
  )

  // renderer.scene is the root test instance.
  // For raw elements (<mesh>, <group>), the element IS renderer.scene.
  // For React function components (<MyComponent />), the rendered output is at
  // renderer.scene.children[0], and Three.js properties are on .instance.
  const mesh = renderer.scene
  expect(mesh.type).toBe('Mesh')
  expect(mesh.children[0]?.geometry.type).toBe('BoxGeometry')
})
```

#### Testing event handler invocation

```typescript
import { firePointerEvent } from '@/test/pointer-helpers'
import { vi } from 'vitest'

test('calls event handler on pointer down', async () => {
  const renderer = await createR3FTestScene(<YourComponent />)
  const component = renderer.scene

  // Test that event handler fires (without validating actual browser capture)
  await firePointerEvent(renderer, component, 'pointerDown', { pointerId: 1 })
  // Assert via component state or spy that handler was called
})
```

**Important:** RTTR tests validate _event dispatch sequencing_ (did the handler run?) but cannot validate actual DOM pointer capture behavior or geometry interactions (drag, collision detection, raycasting). For those, use Playwright E2E tests where the real browser enforces the behavior.

#### Testing frame-dependent logic

```typescript
test('rotates mesh over frames', async () => {
  const renderer = await createR3FTestScene(<YourRotatingComponent />)
  const mesh = renderer.scene

  expect(mesh.rotation.z).toBe(0)

  await renderer.advanceFrames(10)

  expect(mesh.rotation.z).toBeCloseTo(Math.PI / 4, 2)
})
```

### Debugging RTTR Tests

- **Inspect scene tree:** Use `renderer.toGraph()` to print the scene structure
- **Find a specific object:** `renderer.scene.getObjectByName('furniture-id')`
- **Check geometry/material:** `mesh.geometry.parameters`, `mesh.material.color`

### Gotchas to Avoid

- Don't test pointer-geometry behaviors (drag, ray casting, collision) in jsdom; use Playwright E2E instead
- Don't use testing-library's `fireEvent()` for RTTR tests; use `firePointerEvent()` from pointer-helpers
- Don't snapshot 3D scenes; assert on specific properties instead
- Don't forget `advanceFrames()` when testing `useFrame` effects
- `renderer.scene` is the root test instance for raw elements; for React function components, the rendered output is at `renderer.scene.children[0]` and Three.js properties are on `.instance`

## Asset Pipeline

- Keep runtime models under `public/models/` and source assets under `assets-source/`.
- If rotation/placement feels wrong for a model, prefer fixing the asset pivot/origin in source files before adding runtime offsets.
- Any renamed GLTF node must be updated in `src/scene/objects/furniture-catalog.ts`.

## Gotchas

- `getClonedNode` throws when node names are wrong; treat these as hard failures, not optional behavior.
- Drag math is floor-plane based (`Y` fixed, movement on `X/Z`), so keep that model in related features.
- React Three Fiber canvas host semantics can trigger accessibility rule violations; keep landmark/label semantics on explicit DOM wrappers rather than relying on implicit canvas host attributes.
- Keep selection announcements centralized in app-shell reconciliation; avoid duplicate announcement surfaces and avoid moving outliner focus for ordinary pointer/canvas selection.

## Docs

- For project overview, stack, and basic scripts, see `README.md`.
- For roadmap, completion status, and next steps, see `PLAN.md`.

## Commit Hygiene

- Use Conventional Commits for all commits (for example: `feat(scene): add rotation controls`).
- Keep subject lines concise: target ~50 chars, hard max 72 chars.
- When a commit has multiple meaningful aspects, include a body with short bullet points.
- Wrap commit body lines at ~72 chars and keep bullets concise.
- Describe the final state represented by the commit diff, not interim session steps.
- Never include literal `\n` sequences in commit messages; ensure real newlines.
