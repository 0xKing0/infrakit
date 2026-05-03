---
name: infra-sync
description: Regenerate SERVER.md from .infra/config.json and upload it to the server's /root/.context/<project>/. Use whenever the user says "sync", "sync config", "push the config", "regenerate SERVER.md", "update server context", or has just edited config.json and wants the server to see the new state.
argument-hint: [--env <name>]
---

# Sync config to server

## 1. Run sync

```bash
npx @infrasynctech/infra-kit sync $@
```

(Pass through any flags such as `--env staging`.)

## 2. Confirm what changed

The sync command writes:

- `.infra/SERVER.md` (locally — overwritten from `config.json`)
- `/root/.context/<project>/SERVER.md` on each target server
- `/root/.context/INDEX.md` (project registry)

Show the user a one-line diff summary if available, otherwise just the new `SERVER.md` mtime.

## 3. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Synced config $*" >> .infra/CHANGELOG.md
```

## 4. Report

Status glyph + a one-line summary: which envs were synced, and whether SSH worked for each.
