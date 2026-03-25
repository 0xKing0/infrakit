---
name: infra-status
description: Check server health — services, disk, RAM, backups. Use when asked about server status or health.
---

# Health Check

```bash
cat .infra/config.json
docker service ls | grep $INFRA_KIT_PROJECT
df -h /
free -h
docker system df
find /opt/$INFRA_KIT_PROJECT/db/backups/ -mtime -1 -name "*.dump" 2>/dev/null | head -5
```

For each service, check recent logs for errors:
```bash
docker service logs {service} --tail 20 --timestamps 2>&1 | tail -20
```

Report:

```
## Health Check — {project}

**Services:**
- {service}: {replicas} ✅/❌

**System:**
- Disk: {used}/{total} ({percent})
- RAM: {used}/{total}
- Last backup: {timestamp} or ⚠️ MISSING

**Issues:** {list or "None"}
**Recommended actions:** {list or "None"}
```

If any service at 0/N → take autonomous action per infra-ops rules.
