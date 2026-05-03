---
name: infra-ops
description: Operations policy for infra-kit servers — autonomous vs gated actions, error patterns, prohibited operations, post-action protocol. Load this whenever working with .infra/ files, docker services, deployments, scaling, server logs, backups, or any incident response on a managed bare-metal server. Other infra-* skills reference these rules.
---

# infra-kit Server Operations Policy

These are the operating rules for any server managed by infra-kit. Other `infra-*` skills assume you have read this. If you are about to take an action on the server, check this file first.

## Vocabulary

- **Local shell** — runs on the developer's machine. Used for editing `.infra/config.json`, calling `npx infra-kit ...`, writing the local `.infra/CHANGELOG.md`.
- **Server shell** — runs on the production host via the `ssh-{{project}}` MCP server (the `mcp__ssh-*__exec` tool). Used for `docker`, `df`, `free`, `find /opt/...`, `/root/.context/...`.
- `$INFRA_KIT_PROJECT` is set in `.claude/settings.json` and resolves to the project slug. Use it everywhere a path or service prefix is needed.

When in doubt about which shell to use: if the path starts with `/opt/`, `/root/`, or the command is `docker`/`df`/`free`/`uptime`, it is a **server shell** command.

## Decision authority

### Autonomous (act, then report)

| Trigger | Action | Server shell |
|---|---|---|
| A service is at `0/N` replicas | Force restart | `docker service update --force {name}` |
| Disk usage > 80% | Reclaim space | `docker system prune -f` |
| Worker queue stalled (`Queue stalled` in logs) | Restart worker | `docker service update --force {worker}` |
| Backup older than 24h | Run backup | `/opt/$INFRA_KIT_PROJECT/scripts/backup.sh` |
| Crash loop detected (≤3 restarts) | Restart once, then escalate | `docker service update --force {name}` |

After every autonomous action, append to the server CHANGELOG:

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): {ACTION}" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

### Gated (ask first, then act)

| Trigger | Question to user |
|---|---|
| Scale up | "CPU at {x}%. Scale {service} from {n} to {n+1}?" |
| Scale down | "Idle at {x}% CPU. Scale {service} from {n} to {n-1}?" |
| Deploy | "Deploy {service} to {env}? Current image: {image}." |
| Rollback | "Rollback {service} from {current} to {previous}?" |
| DB migration | "Run migration: {description}. Proceed?" |
| Config / env change | "Apply config change: {description}?" |
| Crash loop persisting after 1 restart | "Restart didn't fix {service}. Show logs and stop, or try again?" |

### Forbidden

- Scaling any service to **0 replicas**.
- `rm -rf /opt/$INFRA_KIT_PROJECT/db/` or anything beneath it.
- `docker compose down` against production.
- `cat .env` or any command that prints env file contents.
- Restarting two or more services in the same action.
- Touching `/root/.context/<other-project>/`.
- Host-level changes (`apt`, `systemctl`, `ufw`, `iptables`) without explicit user approval.

## Incident playbooks

### Service down (`0/N`)

1. `docker service logs {name} --tail 50 --timestamps`
2. Match against the **error patterns** table below.
3. `docker service update --force {name}`
4. Wait ~10s, re-check `docker service ls`. If still `0/N` → stop, show logs, ask the user.
5. Append to server CHANGELOG.

### Disk pressure (>80%)

1. `docker system prune -f`
2. If still >80% → `find /opt/$INFRA_KIT_PROJECT -type f -size +100M`
3. Report findings; do not delete project files autonomously.

### Memory pressure (>90%)

1. `docker stats --no-stream` → identify the heaviest container.
2. Report it; recommend scale-up. Do **not** restart for memory pressure alone.

### Crash loop (>3 restarts in 10 min)

1. Stop restarting.
2. Show last 20 log lines.
3. Recommend: rollback, config check, or manual investigation.

## Error patterns

| Log pattern | Likely cause | Autonomous? | Action |
|---|---|---|---|
| `ECONNREFUSED 5432` | Postgres down | yes | restart `postgres` |
| `ECONNREFUSED 6379` | Redis down | yes | restart `redis` |
| `Queue stalled` | BullMQ stuck | yes | restart worker |
| `ENOMEM` / `OOMKilled` | Out of memory | no | recommend scale-up |
| `no space left on device` | Disk full | yes | `docker system prune -f` |
| `connection timeout` | Network/firewall | no | check `ufw status` |
| `EACCES` | Permissions | no | report; do not chmod |
| `SSL_ERROR` | TLS issue | no | check Traefik in Coolify |

## After every server action

1. Verify: `docker service ls | grep $INFRA_KIT_PROJECT`
2. Append to server CHANGELOG (one line, ISO timestamp).
3. If `.infra/config.json` was edited locally → run `npx @infrasynctech/infra-kit sync`.

## Communication

- Open replies with a status glyph: ✅ done · ⚠️ partial · ❌ failed · ❓ blocked.
- Be specific: "postgres at 0/1 for 4 min" beats "something is down".
- State confidence (HIGH / MEDIUM / LOW) when recommending an action.
- Always verify after acting; never report success on the basis of a command exiting 0.
