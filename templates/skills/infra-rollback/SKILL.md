---
name: infra-rollback
description: Roll a service back to its previous Docker Swarm spec. Use whenever the user says "rollback", "roll back", "revert the deploy", "undo the release", "go back to the previous version", "rollback {service}", or asks to restore a service to its prior state. Always confirms by showing current vs. previous image before acting.
argument-hint: <service> [env]
---

# Rollback a service

Roll `$1` (env `$2`, default `production`) back to its previous Swarm spec. Gated action — see `infra-ops`.

## 1. Show current vs previous (server shell)

```bash
SVC="${INFRA_KIT_PROJECT}_$1"
docker service inspect "$SVC" --format \
  'current : {{.Spec.TaskTemplate.ContainerSpec.Image}}
previous: {{.PreviousSpec.TaskTemplate.ContainerSpec.Image}}'
```

If `previous` is empty, **stop**. There is nothing to roll back to. Report this and recommend `/infra-deploy` with a known-good image instead.

## 2. Confirm

> Rollback **$1** in **$2** from `{current}` to `{previous}`?

Wait for explicit yes.

## 3. Roll back (server shell)

```bash
docker service rollback "${INFRA_KIT_PROJECT}_$1"
```

## 4. Verify (server shell)

```bash
docker service ls --filter name=${INFRA_KIT_PROJECT}_$1
docker service logs ${INFRA_KIT_PROJECT}_$1 --tail 30 --timestamps
```

If replicas don't recover within ~30s, follow the **Service down** playbook in `infra-ops`.

## 5. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Rolled back $1 in $2" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Rolled back $1 in $2" >> .infra/CHANGELOG.md
```

## 6. Report

Status glyph + replicas + the image now running.
