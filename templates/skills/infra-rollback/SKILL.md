---
name: infra-rollback
description: Rollback a service to its previous version. Ask for confirmation before rolling back.
argument-hint: [service]
disable-model-invocation: true
---

# Rollback Service

1. Show current vs previous:
```bash
docker service inspect $ARGUMENTS --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"
docker service inspect $ARGUMENTS --format "{{.PreviousSpec.TaskTemplate.ContainerSpec.Image}}"
```

2. Ask: "Rollback $ARGUMENTS from {current} to {previous}?"

3. After confirmation:
```bash
docker service rollback $ARGUMENTS
```

4. Verify:
```bash
docker service ls | grep $ARGUMENTS
docker service logs $ARGUMENTS --tail 20 --timestamps
```

5. Log:
```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Rolled back $ARGUMENTS" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```
