# Room Layout Agent Contract

Keep always-loaded agent context small. Route deeper guidance to
task-specific policy files.

## Core Rules

- Preserve architecture boundaries enforced in `eslint.config.js`.
- Treat `docs/architecture/architecture.md` as architecture policy source of truth.
- Keep runtime code independent from `src/test/**`.
- Do not import `@/scene/internal/**` outside scene runtime/tests.
- Use `@/` alias for source imports unless local relative import is more
  appropriate inside the same module area.

## Required Skills and Tools

- Use `./.agents/skills/git-commit/SKILL.md` when the user asks to commit.
- Use `./.agents/skills/shadcn/SKILL.md` when working on shadcn/ui workflows.
- See `./.agents/skills/README.md` for mixed-source skill provenance and
  formatting ownership.
- Use Context7 for external library/framework docs and setup guidance.

## Validation Defaults

- Keep base checks to `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`.
- Use `pnpm test:e2e` for browser-facing behavior changes.
- For frame-time-sensitive flow changes, rely on the e2e idle-churn gate (`e2e/selected-toolbar-idle.spec.ts`) and profile interactively on a real GPU.
- Run `pnpm fix` before finalizing edits.
- Run `pnpm preflight` for the complete gate (lint, format, typecheck, test:run, knip, build, test:e2e) before finalizing a substantial change.

## Task Routing

- Architecture and placement policy: `./.agents/policies/architecture.md`
- Test selection matrix: `./.agents/policies/testing.md`
- Docs sync and anti-drift policy: `./.agents/policies/docs-sync.md`
- Refactor/move-only playbook: `./.agents/playbooks/refactor-move-only.md`
- Runtime behavior change playbook: `./.agents/playbooks/runtime-change.md`
- UI and accessibility playbook: `./.agents/playbooks/ui-a11y-change.md`

## Human Docs

- Project overview and scripts: `README.md`
- Architecture policy: `docs/architecture/architecture.md`
- Layer-local context:
  - `src/app/README.md`
  - `src/features/README.md`
  - `src/core/README.md`
  - `src/shared/README.md`
  - `src/scene/README.md`

## Scope Guardrails

- Keep AGENTS and `.agents/policies/*` operational and concise.
- Put long explanations in human docs under `docs/`.
- Do not duplicate policy text across AGENTS and docs; link to canonical source.
