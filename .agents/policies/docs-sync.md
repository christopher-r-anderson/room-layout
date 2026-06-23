# Documentation Sync Policy

Goal: keep agent policy and human docs aligned without duplication.

Canonical ownership:

- Architecture policy: `docs/architecture-boundaries.md`
- Project overview, scripts, and contributor entrypoint: `README.md`
- Layer-local intent: `src/*/README.md`
- Agent operating rules: `AGENTS.md` and `.agents/policies/*`

When to update docs in the same change:

1. Architecture boundaries or allowed import surfaces change.
2. Folder ownership changes (`app`, `features`, `core`, `shared`, `scene`).
3. Validation expectations change (required checks, test lane selection).
4. User-facing workflow docs become incorrect due to code changes.

When not to expand scope:

- Do not rewrite unrelated README sections during focused code changes.
- Do not duplicate long technical explanations in AGENTS content.
- Prefer links to canonical docs over repeated prose.

Agent docs style:

- Operational, concise, and action-oriented.
- Keep examples short and only when they prevent repeated mistakes.
- Favor checklists and decision matrices over long narrative.
- Keep long-form explanation in human docs only when it materially helps
  contributors outside the agent workflow.
