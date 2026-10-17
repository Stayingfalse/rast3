# Project skills

Installed for the nightly development work (UI/UX rework from Day 4 onwards).
Claude Code loads skills from `.claude/skills/` and sub-agents from `.claude/agents/`.

| Skill | Source | Version / commit | Licence |
|---|---|---|---|
| `impeccable` (+ 4 `impeccable-*` agents) | https://github.com/pbakaus/impeccable (`.claude/`) | 4.6.0 @ `08d5b47` (2026-10-17) | Apache 2.0 |
| `shadcn` | https://github.com/shadcn-ui/ui (`skills/shadcn`) | @ `d2fba50` (2026-10-16) | MIT |

## Notes

- **impeccable's auto-run hooks are not installed.** Upstream ships a
  `.claude/settings.json` that runs `scripts/impeccable hook` at session start,
  after every Edit/Write and on every Stop. That launcher downloads a prebuilt
  engine binary from impeccable's GitHub releases (SHA-256 checked) on first use.
  Running it automatically on every edit in unattended sessions is opt-in:
  `/impeccable hooks on` (see `impeccable/reference/hooks.md`).
- The skill itself still runs the launcher when used (`scripts/impeccable
  context`), which downloads the engine once per machine.
- shadcn's `evals/` and `agents/openai.yml` were left out (not used by Claude Code).
- The site does not use shadcn/ui yet (no `components.json`); the skill applies
  once we adopt it.

## Updating

Re-copy the folders from the upstream repos at a newer commit and update the
table above. Review diffs to `scripts/` before committing.
