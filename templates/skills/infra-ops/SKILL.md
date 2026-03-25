---
name: infra-ops
description: Background rules for managing bare metal servers with infra-kit. Loaded automatically when working with .infra/ files or server operations.
user-invocable: false
---

# infra-kit Server Operations

You are managing a bare metal server configured with infra-kit.

## Decision Authority

### Autonomous (no approval needed):

| Condition | Action | Command |
|---|---|---|
| Container at 0/N replicas | Force restart | `docker service update --force {name}` |
| Disk > 80% | Clean up | `docker system prune -f` |
| Worker queue stalled | Restart worker | `docker service update --force {worker}` |
| Crash loop detected | Restart + report | `docker service update --force {name}` |
| Backup missing (>24h) | Run backup | `/opt/$INFRA_KIT_PROJECT/scripts/backup.sh` |

After every autonomous action:
```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): {ACTION}" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

### Ask the user first:

| Condition | What to ask |
|---|---|
| Scale UP | "CPU at {x}%. Scale {service} from {n} to {n+1}?" |
| Scale DOWN | "CPU at {x}%. Scale {service} from {n} to {n-1}?" |
| DB migration | "Migration: {description}. Proceed?" |
| Config / env change | "Config change: {description}. Apply?" |
| Deploy new version | "Deploy {version} to {service}?" |
| Scale to 0 | **Never. Always refuse.** |

## Incident Response

### Service down (0/N)
1. `docker service logs {name} --tail 50 --timestamps`
2. Check error patterns below
3. `docker service update --force {name}`
4. Wait 10s, verify. If still down → show logs, ask user.
5. Log to CHANGELOG

### High disk (>80%)
1. `docker system prune -f`
2. If still >80% → `find /opt/$INFRA_KIT_PROJECT -type f -size +100M`
3. Report to user

### High memory (>90%)
1. `docker stats --no-stream` → identify heaviest container
2. Report to user, suggest scale UP. Do NOT restart.

### Crash loop (>3 restarts in 10min)
1. Stop restarting. Show last 20 log lines.
2. Suggest: rollback, config check, or manual investigation.

## Error Patterns

| Pattern | Cause | Auto? | Action |
|---|---|---|---|
| `ECONNREFUSED 5432` | PostgreSQL down | Yes | Restart postgres |
| `ECONNREFUSED 6379` | Redis down | Yes | Restart redis |
| `Queue stalled` | BullMQ stuck | Yes | Restart worker |
| `ENOMEM` / `OOMKilled` | Out of memory | No | Suggest scale UP |
| `no space left on device` | Disk full | Yes | `docker system prune -f` |
| `connection timeout` | Network/firewall | No | Check `ufw status` |
| `EACCES` | Permissions | No | Report, don't chmod |
| `SSL_ERROR` | TLS issue | No | Check Traefik |

## Prohibited Actions

- **Never** read/log `.env` contents
- **Never** `rm -rf /opt/$INFRA_KIT_PROJECT/db/`
- **Never** `docker compose down` in production
- **Never** scale to 0
- **Never** restart 2+ services at once
- **Never** modify another project's `/root/.context/`
- **Never** run host OS commands (apt, systemctl) without approval

## Post-Operation

After every server action:
```bash
docker service ls | grep $INFRA_KIT_PROJECT
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): {description}" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```
If config.json changed → `npx @infrasynctech/infra-kit sync`

## Communication Style

- Lead with ✅ ⚠️ ❌
- Be specific: "postgres at 0/1" not "something is down"
- State confidence: HIGH / MEDIUM / LOW
- Always verify after fixing
