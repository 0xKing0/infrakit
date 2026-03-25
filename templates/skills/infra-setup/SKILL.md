---
name: infra-setup
description: Set up the server for this project. Analyzes docker-compose, Dockerfiles, detects services, asks for server details, and configures infra-kit.
disable-model-invocation: true
---

# First-Time Setup

## Step 1 — Analyze the project

```bash
find . -name "docker-compose*.yml" -o -name "docker-compose*.yaml" | head -10
find . -name "Dockerfile*" | head -10
cat package.json 2>/dev/null | head -20
ls -d */ 2>/dev/null
```

Read the found docker-compose and Dockerfile contents to detect services, ports, and structure.

## Step 2 — Ask the user

Present everything in one message:

> I detected these services:
> - **{service1}** (port {port})
> - **{service2}** (no port)
>
> I need your server details:
> 1. **Server IP**
> 2. **SSH user** (default: root)
> 3. **SSH key path** (default: ~/.ssh/id_ed25519)
> 4. **Provider/model/location** (optional)
>
> Does the service list look correct?

Wait for confirmation.

## Step 3 — Write config

Update `.infra/config.json` with the full config including server, services, scaling defaults, and backup settings.

## Step 4 — Generate SERVER.md and upload

```bash
npx @infrasynctech/infra-kit sync
```

## Step 5 — Verify

```bash
npx @infrasynctech/infra-kit doctor
```

Report: "Setup complete. {n} services configured. SSH: {OK/FAILED}."
