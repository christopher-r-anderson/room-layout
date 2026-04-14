# Project Guidelines

## Build and Test

- Install deps with `pnpm install`.
- Run dev server with `pnpm dev`.
- Validate code with `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`.
- Before finalizing code changes, run `pnpm fix` to apply lint+format fixes.
- For perf-sensitive utility changes, use `pnpm bench` (or `pnpm bench:json` / `pnpm bench:compare`).

## Architecture

- Keep scene/domain behavior in `src/scene/` and keep pure math/Three helpers in `src/lib/three/`.
- Keep utility modules in `src/lib/three/` and `src/lib/ui/` framework-agnostic and testable.
- Treat `src/scene/objects/furniture-catalog.ts` as the single source of truth for model paths and node names.
- Keep `src/App.tsx` focused on app-shell concerns (overlay controls, keyboard wiring) and pass intent to `Scene` via a minimal API.

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
- Avoid over-testing tunable constants unless they are intentional product contracts.

## Asset Pipeline

- Keep runtime models under `public/models/` and source assets under `assets-source/`.
- If rotation/placement feels wrong for a model, prefer fixing the asset pivot/origin in source files before adding runtime offsets.
- Any renamed GLTF node must be updated in `src/scene/objects/furniture-catalog.ts`.

## Gotchas

- `getClonedNode` throws when node names are wrong; treat these as hard failures, not optional behavior.
- Drag math is floor-plane based (`Y` fixed, movement on `X/Z`), so keep that model in related features.

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
