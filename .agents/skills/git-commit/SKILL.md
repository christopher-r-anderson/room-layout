---
name: git-commit
description: 'Execute git commit with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Auto-detecting type and scope from changes, (2) Generating conventional commit messages from diff, (3)  Intelligent file staging for logical grouping'
license: MIT
allowed-tools: Bash
metadata:
  orig: https://github.com/github/awesome-copilot/blob/main/skills/git-commit/SKILL.md
---

# Git Commit with Conventional Commits

## Overview

Create standardized, semantic git commits using the Conventional Commits specification. Analyze the actual diff to determine appropriate type, scope, and message.

## Conventional Commit Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types

| Type       | Purpose                        |
| ---------- | ------------------------------ |
| `feat`     | New feature                    |
| `fix`      | Bug fix                        |
| `docs`     | Documentation only             |
| `style`    | Formatting/style (no logic)    |
| `refactor` | Code refactor (no feature/fix) |
| `perf`     | Performance improvement        |
| `test`     | Add/update tests               |
| `build`    | Build system/dependencies      |
| `ci`       | CI/config changes              |
| `chore`    | Maintenance/misc               |
| `revert`   | Revert commit                  |

## Style

- One logical change per commit
- Present tense: "add" not "added"
- Imperative mood: "fix bug" not "fixes bug"

### Subject

- Conventional Commit style
- target 50 chars, hard 72 char limit
- When given a ticket number, append to end of subject like `#<number>`

### Body

- *No* prose or long form content, em dash separated phrases, etc.
- Body must be a bullet list of general actions - do not replicate fine detail better served by a diff
- Each item is a succinct, leading lowercase phrase
- Attempt to keep lines less than 72 chars, otherwise wrap lines at 72 chars
- Do not create long lists for things like file names
- Describe the final state represented by the commit diff as a logical unit since the previous commit - do not include interim session steps, revisions, decisions, or justifications.
- *Use the multiline commit approach below and verify that there are no literal `\n` newlines in the committed message*

## Example

Use this example for style, *do not copy for content.*

```bash
git commit -m "$(cat <<'EOF'
feat(ui): add delete action #45

- add delete button in action toolbar
- add delete confirmation dialog
- assign delete and backspace shortcut key to delete action
- document delete in README.md

EOF
)"
```

## Workflow

### 1. Analyze Diff

```bash
# If files are staged, use staged diff
git diff --staged

# If nothing staged, use working tree diff
git diff

# Also check status
git status --porcelain
```

### 2. Stage Files (if needed)

If nothing is staged or you want to group changes differently:

```bash
# Stage specific files
git add path/to/file1 path/to/file2

# Stage by pattern
git add *.test.*
git add src/components/*

# Interactive staging
git add -p
```

**Never commit secrets** (.env, credentials.json, private keys).

### 3. Generate Commit Message

Analyze the diff to determine:

- **Type**: What kind of change is this?
- **Scope**: What area/module is affected?
- **Description**: One-line summary of what changed (present tense, imperative mood, <72 chars)

### 4. Execute Commit

```bash
# Single line
git commit -m "<type>[scope]: <description>"

# Multi-line with body/footer
git commit -m "$(cat <<'EOF'
<type>[scope]: <description>

<optional body>

<optional footer>
EOF
)"
```

## Git Safety Protocol

- NEVER update git config
- NEVER run destructive commands (--force, hard reset) without explicit request
- NEVER skip hooks (--no-verify) unless user asks
- NEVER force push to main/master
- If commit fails due to hooks, fix and create NEW commit (don't amend)
