# Agent Guidance Modules

Keep agent guidance modular so root AGENTS context stays small.

Load policy and playbook files on demand. Do not assume every task needs every
module.

- `policies/`: stable rules and decision matrices.
- `playbooks/`: task-oriented execution checklists.
- `skills/`: reusable skills with their own invocation criteria.

Skills in `.agents/skills/` may be mixed-source:

- custom repo-owned skills (for example `git-commit`)
- externally installed skills (for example `shadcn`)

Keep custom skills format-enabled. When adding externally managed skills, add
their directories to `.prettierignore` so automated updates are not rewritten.

Use AGENTS.md as the entrypoint and load deeper files only when needed.
