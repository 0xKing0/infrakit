---
name: infra-status
description: Full health check of the project's services on the server — replicas, disk, RAM, recent log errors, last backup. Use whenever the user says "status", "is everything ok", "health check", "how's prod", "check the server", "any errors", "what's broken", or asks for a quick overview of service health.
argument-hint: [env]
---

# Health check

Report on the project running in env `$1` (default `production`).

## 1. Read local config

```bash
cat .infra/config.json
```

Note service names and the `scaling`/`backup` settings.

## 2. Server snapshot (server shell)

```bash
docker service ls | grep "$INFRA_KIT_PROJECT" || echo "(no services)"
df -h /
free -h
docker system df
find /opt/$INFRA_KIT_PROJECT/db/backups/ -mtime -1 -name "*.dump" 2>/dev/null | head -5
```

## 3. Per-service log scan (server shell)

For each service in the config, sample recent logs and grep for error signatures:

```bash
docker service logs ${INFRA_KIT_PROJECT}_{service} --tail 50 --timestamps 2>&1 \
  | grep -iE "error|fatal|panic|exception|stalled|OOMKilled|ECONNREFUSED" \
  | tail -10
```

## 4. Report

Use this format:

```
## {project} — {env}

Services
- {service}: {replicas} {glyph}

System
- Disk: {used}/{total} ({pct})
- RAM:  {used}/{total}
- Last backup: {ts} or ⚠️ MISSING

Issues
- {one line each, or "None"}

Recommended
- {action} or "None"
```

## 5. Act on autonomous triggers

If anything in the report matches an autonomous trigger from `infra-ops` (service at 0/N, disk >80%, worker stalled, backup missing >24h), **act on it now**, then add the action to the report.

For gated triggers (scale, deploy, rollback, migration), do **not** act — list them under "Recommended".
