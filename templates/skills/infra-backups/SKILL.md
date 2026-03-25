---
name: infra-backups
description: Check backup status and run manual backup if needed.
---

# Backup Check

```bash
find /opt/$INFRA_KIT_PROJECT/db/backups/ -mtime -1 -name "*.dump" -ls
ls -lh /opt/$INFRA_KIT_PROJECT/db/backups/ | tail -5
```

If no backup in last 24 hours:
```bash
/opt/$INFRA_KIT_PROJECT/scripts/backup.sh
```

Report backup status: last backup time, size, and whether it's current.
