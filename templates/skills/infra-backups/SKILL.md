---
name: infra-backups
description: Inspect database backup status and trigger a manual backup if the latest is stale. Use whenever the user says "backup", "backups", "is the database backed up", "when was the last backup", "run a backup", "snapshot the db", or asks anything about backup freshness or restoration.
argument-hint: ["run"]
---

# Backups

All commands run on the **server shell**.

## 1. List recent dumps

```bash
ls -lh /opt/$INFRA_KIT_PROJECT/db/backups/ 2>/dev/null | tail -10
find /opt/$INFRA_KIT_PROJECT/db/backups/ -mtime -1 -name "*.dump" -ls 2>/dev/null
```

## 2. Decide

- A `*.dump` from the last 24h exists → report freshness and stop.
- No fresh dump, OR the user passed `run` → continue.

## 3. Run a manual backup

This is autonomous per `infra-ops` (backup older than 24h triggers a run):

```bash
/opt/$INFRA_KIT_PROJECT/scripts/backup.sh
```

Then re-list to confirm a new file appeared:

```bash
ls -lh /opt/$INFRA_KIT_PROJECT/db/backups/ | tail -3
```

## 4. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Manual backup run" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

## 5. Report

Last backup timestamp, size, retention vs `backup.retentionDays` from config, and whether S3 upload succeeded if the script logs that.
