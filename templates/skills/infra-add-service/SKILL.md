---
name: infra-add-service
description: Register a new service in .infra/config.json and sync it to the server. Use whenever the user says "add a service", "register a service", "new service", "add {name} to infra-kit", "track this container with infra-kit", or asks to make infra-kit aware of an additional containerized component of the project.
argument-hint: [name]
---

# Add a service

## 1. Gather details

If `$1` was passed, use it as the service name. Otherwise ask:

- Service name (e.g. `api`, `worker`, `web`)
- Deploy path on server (default: `/opt/$INFRA_KIT_PROJECT/{name}/`)
- Exposed port (optional)
- Coolify deploy webhook URL per environment (optional — can be set later via `/infra-add-env`)

## 2. Update `.infra/config.json`

Read the file, then append to `services`:

```json
{
  "name": "<name>",
  "path": "/opt/<project>/<name>/",
  "port": <port or null>,
  "deployWebhook": {
    "production": "<url or null>"
  }
}
```

If the config is in the legacy single-environment shape (no `environments` key), keep `services` at the top level. If it's multi-env, add the service under each `environments.<env>.services` array.

## 3. Sync

```bash
npx @infrasynctech/infra-kit sync
```

This regenerates `.infra/SERVER.md` and uploads it.

## 4. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Added service {name}" >> .infra/CHANGELOG.md
```

## 5. Report

> ✅ Added `{name}`. Run `/infra-deploy {name}` once a Coolify webhook is wired up.
