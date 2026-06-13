# Skills Provenance

Track which skills are repo-owned versus externally managed.

| Skill        | Source                        | Formatting ownership |
| ------------ | ----------------------------- | -------------------- |
| `git-commit` | custom (repo)                 | format-enabled       |
| `shadcn`     | external install (`skill.sh`) | ignored by Prettier  |

Maintenance rule:

1. When adding an externally managed skill under `.agents/skills/`, add the
   skill directory to `.prettierignore`.
2. Update this table to record source and formatting ownership.
