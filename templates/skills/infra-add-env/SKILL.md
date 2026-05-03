---
name: infra-add-env
description: Add a new environment (staging, production, preview, etc.) to .infra/config.json, including its server, services, and scaling/backup defaults. Migrates a legacy single-server config to the multi-environment shape on first use. Use whenever the user says "add staging", "add an environment", "set up staging", "add a new env", "I want a preview env", or asks to manage more than one server with this project.
argument-hint: [name]
---

# Add an environment

## 1. Gather details

If `$1` was passed, use it as the env name. Otherwise ask:

- Environment name (e.g. `staging`, `preview`)
- Server IP
- SSH port (default `22`)
- SSH user (default `root`)
- SSH key path (default `~/.ssh/id_ed25519`)
- Copy services and scaling/backup settings from `production`? (default yes)

## 2. Migrate legacy shape if needed

Read `.infra/config.json`. If it has top-level `server`/`services`/`scaling`/`backup` (legacy single-env), restructure to:

```json
{
  "project": "<project>",
  "environments": {
    "production": { "server": ..., "services": [...], "scaling": {...}, "backup": {...} }
  }
}
```

Preserve everything that was there.

## 3. Add the new environment

Add `environments.<name>` with the user-supplied server details. If they said "copy from production", deep-copy `services`, `scaling`, and `backup`; clear any per-env webhooks (they need to be re-issued by Coolify).

## 4. Sync the new env

```bash
npx @infrasynctech/infra-kit sync --env <name>
```

This generates `SERVER.md` for the new env and uploads it. It also registers the env under `/root/.context/<project>/` on the new server.

## 5. Update `.claude/settings.json`

Add an MCP server entry `ssh-<name>` so future commands can target the new env:

```json
"ssh-<name>": {
  "command": "npx",
  "args": ["-y", "ssh-mcp", "--", "--host=<ip>", "--port=<port>", "--user=<user>", "--key=<keyPath>"]
}
```

## 6. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Added environment <name>" >> .infra/CHANGELOG.md
```

## 7. Report

> ✅ `<name>` added. Use `--env <name>` (or pass `<name>` as the second arg) on `/infra-deploy`, `/infra-rollback`, `/infra-scale`, `/infra-status`.
