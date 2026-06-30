# UI Components Policy

This guide defines how the project uses shadcn-derived components and related
maintenance exceptions.

## Ownership Model

Components under `src/shared/ui/` are project-owned after installation. They
are not treated as immutable vendor code.

Use shadcn install flows as scaffolding, then maintain resulting components as
normal repository code.

## Logical CSS Properties

Inline-axis spacing and alignment use logical Tailwind utilities (`ms`/`me`,
`ps`/`pe`, `border-s`/`border-e`, `rounded-s`/`rounded-e`, `text-start`/`text-end`,
`inset-s`/`inset-e`) so layout follows reading direction. `components.json` sets
`"rtl": true`, so newly scaffolded components arrive in this form.

Physical utilities stay where placement is physical or ergonomic rather than
reading-order: scene transform anchors, the right-pinned camera/room cluster,
dialog centering, the tooltip arrow geometry, and third-party direction APIs
(vaul). Each such case is marked inline.

`src/logical-css-properties.test.ts` guards the convention by failing on physical
inline-axis utilities that have a logical equivalent. Mark a deliberate physical
case with a `logical-css-allow` comment on or above the line.

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
