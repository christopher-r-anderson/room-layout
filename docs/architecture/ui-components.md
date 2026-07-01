# UI Components Policy

This guide defines how the project uses shadcn-derived components and the logical
CSS property convention.

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

When an RTL locale is added, these deliberate physical cases are the ones to
re-verify - they do not follow `dir` and may need `:dir()` handling. See
[Internationalization](i18n.md#adding-a-locale).

## Related Docs

- `README.md`
- `.agents/skills/shadcn/SKILL.md`
- `docs/architecture/i18n.md`
