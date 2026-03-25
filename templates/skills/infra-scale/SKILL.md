---
name: infra-scale
description: Scale a service to N replicas. Ask for confirmation before scaling.
argument-hint: <service> <replicas>
disable-model-invocation: true
---

# Scale Service

Scale `$0` to `$1` replicas.

1. Show current state:
```bash
docker service ls | grep $0
```

2. Ask for confirmation: "Scale $0 to $1 replicas?"

3. After confirmation:
```bash
docker service scale $0=$1
```

4. Verify:
```bash
docker service ls | grep $0
```

5. Log:
```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Scaled $0 to $1 replicas" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

Never scale to 0. Warn if exceeding maxReplicas from config.
