# Planner guidance

React 19, TypeScript, three.js/react-three-fiber, zustand, Tailwind CSS 4,
Base UI, Lingui, Vite, and pnpm.

## Commands

From this workspace use `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`,
`pnpm test:run`, and `pnpm test:e2e`. From root use
`pnpm --filter room-layout <command>`. First browser run needs
`pnpm test:e2e:install`.

## Architecture

`docs/architecture/architecture.md` defines placement policy;
`eslint.config.js` enforces the boundaries. Layers under `src/`:

- `app`: composition root, chrome, dialogs, and command wiring.
- `features`: user-facing capabilities; features never import each other.
- `core`: headless stores, operations, commands, and persistence.
- `scene`: 3D rendering; internals stay inside `scene/internal`.
- `domain`: pure catalog, furniture, and geometry; imports no other layer.
- `shared`: reusable UI, utilities, and hooks with no editor knowledge.
- `test`: test helpers; runtime code never imports them.

Use `@/` imports unless local relative imports suit the same module area.

## Testing and docs

Add browser tests for browser-facing behavior changes. The deterministic
`e2e/selected-toolbar-idle.spec.ts` gate checks idle work; measure actual frame
time on a real GPU. See `docs/architecture/testing.md` for lanes and determinism.

- `docs/architecture/`: canonical subsystem documentation.
- `docs/decisions/`: historical architecture decisions.
- `docs/testing/`: intentional unit-test exclusions.
- `src/*/README.md`: layer-local intent.
- `docs/guide/` and `docs/reference/`: user guides and public contracts.
- UI components are repository-owned; see `docs/architecture/ui-components.md`.
