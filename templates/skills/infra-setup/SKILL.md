---
name: infra-setup
description: First-time configuration of infra-kit for the current project — analyzes docker-compose / Dockerfiles, asks for server details, writes .infra/config.json, generates SERVER.md, and verifies the setup. Use whenever the user says "setup", "set up infra-kit", "first-time setup", "configure infra-kit", "init this project", or right after running `npx infra-kit init` for the first time.
---

# First-time setup

This is the only time you should be modifying `.infra/config.json` from scratch. After this, prefer `/infra-add-service`, `/infra-add-env`, or direct edits.

## 1. Analyze the project (local shell)

```bash
find . -maxdepth 3 \( -name "docker-compose*.yml" -o -name "docker-compose*.yaml" \) -not -path "*/node_modules/*"
find . -maxdepth 3 -name "Dockerfile*" -not -path "*/node_modules/*"
ls -d */ 2>/dev/null
```

Read each docker-compose file you find. Extract:

- Service names
- Exposed ports
- Image references vs build contexts (build contexts → infra-kit-managed; pure image refs → external)

## 2. Present detected services and ask for server details

Send one consolidated message:

> I detected these services:
> - **{svc}** — port `{port}` (or "no port")
>
> To configure the server I need:
> 1. **Server IP**
> 2. **SSH port** (default `22`)
> 3. **SSH user** (default `root`)
> 4. **SSH key path** (default `~/.ssh/id_ed25519`)
> 5. **Provider / model / location** (optional — for SERVER.md docs only)
>
> Should I drop or rename any of the detected services?

Wait for answers.

## 3. Write `.infra/config.json`

Build the full config with:

- `project` — directory basename
- `server` — the user's answers
- `services` — detected services, with `path` defaulted to `/opt/<project>/<name>/`
- `scaling` — defaults (`cpuUp: 70, cpuDown: 20, minReplicas: 1, maxReplicas: 6`) unless the user says otherwise
- `backup` — defaults (`schedule: "0 3 * * *", retentionDays: 7, s3Bucket: "<project>-backups"`)

Use the existing skeleton file written by `infra-kit init` as the starting point — only fill in the empty fields.

## 4. Sync

```bash
npx @infrasynctech/infra-kit sync
```

This generates `SERVER.md` and uploads it. It also creates `/root/.context/<project>/` and registers the project in `/root/.context/INDEX.md`.

## 5. Verify

```bash
npx @infrasynctech/infra-kit doctor
```

If anything fails, surface it through `/infra-doctor`-style reporting. **Do not** silently retry or auto-fix.

## 6. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): infra-setup completed" >> .infra/CHANGELOG.md
```

## 7. Report

> ✅ Setup complete.
> {n} services configured · SSH: {OK/FAILED} · Coolify: {detected/not detected}
> Next: `/infra-status` to see the live state, or `/infra-deploy {svc}` once a webhook is wired up.
