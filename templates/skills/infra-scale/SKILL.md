---
name: infra-scale
description: Scale a Docker Swarm service to N replicas. Use whenever the user says "scale", "scale up", "scale down", "add a replica", "remove a replica", "set N workers", "scale {service} to {n}", or asks to change the replica count of a service. Refuses to scale to 0 and warns when exceeding maxReplicas from config.
argument-hint: <service> <replicas> [env]
---

# Scale a service

Scale `$1` to `$2` replicas in env `$3` (default `production`). Gated action — see `infra-ops`.

## 1. Refuse the obvious bad cases

- If `$2` is `0` → **refuse**. Per `infra-ops`, scaling to 0 is forbidden. Suggest stopping the service via Coolify if the user actually wants it offline.
- If `$2 > scaling.maxReplicas` (from `.infra/config.json`) → warn and ask whether to raise the cap first.
- If `$2 < scaling.minReplicas` → warn and ask whether to lower the floor first.

## 2. Show current state (server shell)

```bash
docker service ls --filter name=${INFRA_KIT_PROJECT}_$1
```

## 3. Confirm

> Scale **$1** in **$3** from `{current}` to `$2` replicas?

Wait for explicit yes.

## 4. Apply (server shell)

```bash
docker service scale ${INFRA_KIT_PROJECT}_$1=$2
```

## 5. Verify (server shell)

```bash
for i in 1 2 3; do
  docker service ls --filter name=${INFRA_KIT_PROJECT}_$1
  sleep 5
done
```

## 6. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Scaled $1 to $2 in $3" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Scaled $1 to $2 in $3" >> .infra/CHANGELOG.md
```

## 7. Report

Status glyph + final replica count.
