# @infrasynctech/infra-kit

AI-ready infrastructure scaffolding — Claude Code skills for bare metal servers.

## How It Works

```bash
npx @infrasynctech/infra-kit init
```

This installs 16 Claude Code skills into `.claude/skills/`. Then open Claude Code:

```
/infra-bootstrap   # fresh server — installs Docker, Swarm, Coolify, ufw
/infra-setup       # then configure infra-kit for this project
```

Use `/infra-bootstrap` if the server is brand new and has nothing on it yet. Skip it and go straight to `/infra-setup` if Docker and Coolify are already running.

After setup, use slash commands or just talk naturally:

| Command | What it does |
|---|---|
| `/infra-bootstrap` | Provision a fresh server |
| `/infra-status` | Full health check |
| `/infra-logs api` | Service logs |
| `/infra-scale api 3` | Scale a service |
| `/infra-deploy api` | Deploy via Coolify |
| `/infra-rollback api` | Rollback to previous |
| `/infra-history` | Show CHANGELOG |
| `/infra-overview` | All projects on server |
| `/infra-backups` | Check/run backups |
| `/infra-doctor` | Diagnose issues |
| `/infra-add-service` | Add a new service |
| `/infra-add-env` | Add staging environment |
| `/infra-workflow` | Generate GitHub Actions |
| `/infra-sync` | Sync config to server |

Or just say "check the server", "show me the logs", "scale up the worker" — Claude understands both.

---

## What Gets Installed

```
.claude/
├── settings.json                  ← SSH MCP + permissions
└── skills/
    ├── infra-ops/SKILL.md         ← background rules (auto-loaded)
    ├── infra-bootstrap/SKILL.md   ← /infra-bootstrap (fresh server)
    ├── infra-setup/SKILL.md       ← /infra-setup
    ├── infra-status/SKILL.md      ← /infra-status
    ├── infra-logs/SKILL.md        ← /infra-logs
    ├── infra-scale/SKILL.md       ← /infra-scale
    ├── infra-deploy/SKILL.md      ← /infra-deploy
    ├── infra-rollback/SKILL.md    ← /infra-rollback
    └── ...

.infra/
├── config.json                    ← project config (gitignored)
├── SERVER.md                      ← server context (auto-generated)
└── CHANGELOG.md                   ← change history

On server:
/root/.context/
├── INDEX.md                       ← all projects index
└── <project>/
    ├── SERVER.md
    └── CHANGELOG.md
```

---

## CLI (Minimal)

Only 5 commands — everything else is handled by Claude skills:

| Command | Purpose |
|---|---|
| `infra-kit init` | Scaffold project (run once) |
| `infra-kit sync` | Regenerate SERVER.md + upload |
| `infra-kit doctor` | Verify setup |
| `infra-kit upgrade-skill` | Update skills to latest version |
| `infra-kit generate-workflow` | Create GitHub Actions pipeline |

---

## Requirements

- Node.js 18+
- On server: Ubuntu 22.04+, Docker
- SSH key access
