# Testing Policy (Agent Quick Reference)

Default validation set:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`

Keep detailed test strategy here; keep human docs at the command-and-workflow
level unless a contributor-facing reminder is needed.

Test selection matrix:

1. Pure utility/state logic change
   - Run targeted unit tests plus `pnpm test:run` when practical.
2. Scene interaction, startup, history, keyboard, share, or URL restore behavior
   - Run relevant Playwright coverage (`pnpm test:e2e`).
3. Accessibility semantics, focus order, announcements, dialog behavior
   - Run accessibility/browser coverage including `e2e/editor-a11y-audits.spec.ts`.
4. Frame-time-sensitive interactions (drag/rotate/collision/camera transitions)
   - Run perf scenarios (`pnpm test:browser:perf`).
5. Move/rename-only refactors with no behavior change
   - At minimum run `pnpm lint` and `pnpm typecheck`.
   - Run broader tests when import rewiring touches high-risk paths.
   - Move any path-based test fixtures, mocks, and snapshots with the code they
     cover.

Execution notes:

- Prefer behavior assertions over implementation details.
- Prefer tolerant float assertions (`toBeCloseTo`) for geometry-derived values.
- For scene-only Playwright assertions, use shared overlay-hidden harness helpers.
- Keep overlays visible when testing accessibility/layout/hit-target contracts.
- e2e runs against the preview build (`pnpm test:e2e` already does this); never
  point it at the dev server — optimizer/HMR reloads cause intermittent flakes.
- Use bounded, deterministic inputs in browser tests; never hold an input until a
  CDP-polled condition (release latency makes the magnitude unbounded under
  load). Keep exact-value checks in unit tests.
