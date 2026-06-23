# UI Components Policy

This guide defines how the project uses shadcn-derived components and related
maintenance exceptions.

## Ownership Model

Components under `src/shared/ui/` are project-owned after installation. They
are not treated as immutable vendor code.

Use shadcn install flows as scaffolding, then maintain resulting components as
normal repository code.

## Current Knip Exception

`knip.json` currently ignores unused exports for `src/shared/ui/*.tsx`.

Rationale:

- preserve reusable component exports that are intentionally available but not
  currently imported in app code
- avoid churn from deleting and re-adding utility component exports during UI
  iteration

## Exit Criteria

Revisit and remove this exception when either condition is true:

1. UI surface stabilizes and unused exports can be pruned with confidence.
2. A stricter component-level export policy is adopted for `src/shared/ui/`.

## Related Docs

- `README.md`
- `knip.json`
- `.agents/skills/shadcn/SKILL.md`
