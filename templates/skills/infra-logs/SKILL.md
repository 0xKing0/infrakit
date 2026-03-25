---
name: infra-logs
description: Show logs for a service. Use when asked about logs, errors, or what's happening with a service.
argument-hint: <service> [-f]
---

# Service Logs

Show logs for `$ARGUMENTS`:

```bash
docker service logs $0 --tail 100 --timestamps
```

If `-f` or "follow" is mentioned:
```bash
docker service logs $0 --follow --timestamps
```

To search for errors:
```bash
docker service logs $0 --tail 500 2>&1 | grep -i "error\|fatal\|panic\|exception"
```

Summarize the key findings after showing logs.
