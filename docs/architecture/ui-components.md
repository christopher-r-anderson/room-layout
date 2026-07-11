# UI Components Policy

This guide defines how the project uses shadcn-derived components and the logical
CSS property convention.

## Ownership Model

Components under `src/shared/ui/` are project-owned after installation. They
are not treated as immutable vendor code.

Use shadcn install flows as scaffolding, then maintain resulting components as
normal repository code.

## Adding a New Component

When the project needs a component that the shadcn registry provides, install
it as scaffolding (`pnpm dlx shadcn@latest add <component>`), then adapt it to
repository conventions before use:

- logical CSS utilities (see below); `components.json` sets `"rtl": true` so
  new scaffolds mostly arrive in this form
- user-facing strings routed through Lingui (`docs/architecture/i18n.md`)
- align primitives with the components already in `src/shared/ui/` (Base UI)

Once adapted, the component is owned: it is never diffed against or updated
from the shadcn registry.

## Testing

Ownership extends to testing: `shared/ui` follows the repository's value rule
(test for value, never for a coverage number — see
[testing.md](testing.md#coverage)), not a blanket exclusion.

- Thin wrappers over Base UI primitives are not unit-tested. Their interaction
  behavior (open/close, focus, dismissal) is the library's, tested upstream;
  the project layer is composition and styling, exercised by the e2e lane
  through real dialogs, drawers, and toolbars.
- Components that add a project contract are unit-tested in place — e.g.
  `tool-button` (label/assistive-tech contract), `dialog`/`alert-dialog`
  (mobile gutter survival under caller class merges), and
  `keyboard-shortcut-display` (shortcut formatting).
- The folder is included in the coverage map like any owned code; the
  deliberate unit-level gaps are recorded in
  [intentional-unit-exclusions.md](../testing/intentional-unit-exclusions.md).

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
- `docs/architecture/i18n.md`
