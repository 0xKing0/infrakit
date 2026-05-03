---
name: infra-doctor
description: Diagnose infra-kit setup problems — missing or invalid config.json, broken SSH access, missing context files on the server, Docker availability, MCP server registration. Use whenever the user says "doctor", "diagnose", "something's wrong with my setup", "why isn't this working", "infra-kit broken", "check my setup", or after any failed infra-* command.
---

# Diagnose setup

## 1. Run the bundled doctor

```bash
npx @infrasynctech/infra-kit doctor
```

This checks:

- `.infra/config.json` exists and is valid JSON
- `.claude/settings.json` exists and references the right project slug
- SSH connectivity to each configured environment
- `/root/.context/$INFRA_KIT_PROJECT/SERVER.md` is present and recent
- Docker is reachable on the server

## 2. Interpret the output

For each failed check, surface:

- **What failed** (one line, plain language).
- **Why it matters** (which infra-* skills it breaks).
- **The exact fix command** the user should run, or the file/field they should edit.

Common fixes:

| Failure | Fix |
|---|---|
| `config.json` missing | `npx @infrasynctech/infra-kit init` |
| Server unset | `/infra-setup` |
| SSH refused | check `.claude/settings.json` → `mcpServers.ssh-*` args, then key permissions |
| `SERVER.md` stale | `/infra-sync` |
| Coolify token missing | export `COOLIFY_TOKEN` in shell |

## 3. Do not auto-fix

Doctor is read-only by design. Do not modify configuration to "fix" what doctor reports. Surface the problem and let the user decide.
