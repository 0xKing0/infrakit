---
name: infra-history
description: Show recent infrastructure changes from CHANGELOG (deploys, rollbacks, scale events, autonomous restarts). Use whenever the user says "what changed", "recent deploys", "history", "changelog", "what did you do", "what happened on the server", "show changes", or asks for a timeline of infra activity.
argument-hint: [N|"local"|"server"]
---

# Change history

Show the last `$1` entries (default 30) from the CHANGELOGs.

## Local CHANGELOG

```bash
tail -n ${1:-30} .infra/CHANGELOG.md
```

## Server CHANGELOG (server shell)

```bash
tail -n ${1:-30} /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

## Modes

- No arg, or numeric arg → show both, server first.
- `local` → only local.
- `server` → only server.

## Report

Group entries by day. For each day, list events most-recent-first. Call out anything that looks like an incident (multiple restarts of the same service, repeated rollbacks, missing backups).
