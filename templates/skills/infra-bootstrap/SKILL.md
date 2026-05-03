---
name: infra-bootstrap
description: First-time provisioning of a fresh bare-metal server — installs Docker, initializes Swarm, installs Coolify, opens the firewall, and creates the /root/.context/ tree. Use whenever the user says "bootstrap the server", "set up a new server", "provision the server", "install Coolify", "fresh server setup", "prepare the box", "first time on this server", or anything that implies the target host has nothing on it yet. This runs BEFORE /infra-setup. /infra-setup configures infra-kit for an already-prepared server; this skill prepares the server itself.
argument-hint: [env]
---

# Bootstrap a fresh server

This skill prepares a brand-new Ubuntu host so the rest of infra-kit can use it. It is destructive in the sense that it installs system packages, opens firewall ports, and starts services. **Always confirm before proceeding.**

Default env is `production` (or the only env in `.infra/config.json`). Pass a different env as `$1`.

## 1. Resolve the target

Read `.infra/config.json` locally to get the server details for env `$1`:

- `environments.<env>.server.{ip,port,user,keyPath}` (multi-env shape), or
- top-level `server.{...}` (legacy single-env).

If `server.ip` is `CONFIGURE_ME` or missing, **stop**. Run `/infra-setup` first to fill in the server details — this skill needs SSH access to the host.

## 2. Verify SSH (server shell)

```bash
ssh -o BatchMode=yes -o ConnectTimeout=5 -p ${PORT} ${USER}@${IP} "uname -a && cat /etc/os-release | grep PRETTY_NAME"
```

If this fails, surface the SSH error verbatim and stop.

Confirm the OS is Ubuntu 22.04 or newer. Refuse to proceed on anything else without explicit user override.

## 3. Detect what's already installed (server shell)

```bash
command -v docker && docker --version || echo "docker: missing"
docker info 2>/dev/null | grep -E "Swarm|Server Version" || echo "swarm: not initialized"
curl -fsS http://localhost:8000/api/health 2>/dev/null && echo "coolify: running" || echo "coolify: missing"
ufw status 2>/dev/null | head -1 || echo "ufw: not installed"
```

Build a one-screen summary of what's there and what's missing.

## 4. Confirm with the user

Show:

> **Bootstrap target:** `${USER}@${IP}` (env: `$1`)
> **OS:** {pretty_name}
> **Will install:** {missing components}
> **Will skip:** {already-installed components}
> **Will open ports:** 22 / 80 / 443 / 8000
>
> Proceed?

If anything in "Will install" is already partially configured (e.g. Docker installed but Swarm not active), say so explicitly. Wait for explicit yes.

## 5. Install Docker (server shell, if missing)

Use the official convenience script:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

Verify:

```bash
docker run --rm hello-world
```

## 6. Initialize Swarm (server shell, if not active)

```bash
docker swarm init --advertise-addr ${IP} || true
docker info | grep "Swarm:"
```

If `docker swarm init` fails because Swarm is already active, that's fine — proceed.

## 7. Firewall (server shell)

If `ufw` is present:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
yes | ufw enable
ufw status verbose
```

If `ufw` is not installed, skip — do **not** install it without asking. Some hosts manage firewalls externally.

## 8. Install Coolify (server shell, if missing)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Then poll up to ~3 min for the API to come up:

```bash
for i in $(seq 1 18); do
  if curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
    echo "coolify: ready"; break
  fi
  sleep 10
done
```

If it never comes up, surface `docker ps | grep coolify` and the last 50 lines of `journalctl -u docker --since "5 min ago"`. Stop.

## 9. Seed the context tree (server shell)

```bash
mkdir -p /root/.context/$INFRA_KIT_PROJECT
[ -f /root/.context/INDEX.md ] || cat > /root/.context/INDEX.md <<'EOF'
# Server Project Index

This server is managed by infra-kit. Each subdirectory is a project.

| Project | Path | Notes |
|---|---|---|
EOF
```

Append the current project to `INDEX.md` if it isn't already listed.

## 10. Log

On the server:

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Bootstrapped server (docker, swarm, coolify, ufw)" \
  >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

Locally:

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Bootstrapped $1 server" >> .infra/CHANGELOG.md
```

## 11. Report

> ✅ Server bootstrapped.
>
> - **Coolify:** http://${IP}:8000
> - **First login:** open the URL above and create the admin user immediately. Coolify is unauthenticated until the first account is registered — do this within minutes.
> - **API token:** once logged in, generate one at *Keys & Tokens → API Tokens*. Export it in your shell as `COOLIFY_TOKEN` so `/infra-deploy` can call webhooks.
> - **Swarm:** active, manager node `${IP}`.
> - **Firewall:** 22 / 80 / 443 / 8000 open.
>
> Next steps:
> 1. Register the Coolify admin account.
> 2. In Coolify, add this project's services and copy the deploy webhook URL for each.
> 3. Run `/infra-add-service` (or edit `.infra/config.json`) to record the webhooks.
> 4. Run `/infra-sync` to push `SERVER.md` to the host.
> 5. `/infra-status` to confirm everything is healthy.

## Refusals

- Refuse to run on a server that already has Coolify *and* a populated `/opt/` from another project, unless the user explicitly confirms — bootstrapping a shared host can break neighbors.
- Refuse to install `ufw` if it's missing — host firewalling may be done elsewhere; ask first.
- Never disable an existing firewall rule.
- Never run on `localhost` / `127.0.0.1` without explicit confirmation; this is meant for remote hosts.
