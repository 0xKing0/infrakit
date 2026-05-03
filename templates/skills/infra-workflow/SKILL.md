---
name: infra-workflow
description: Generate a GitHub Actions workflow that deploys this project on push (calls Coolify webhooks via SSH). Use whenever the user says "generate workflow", "github actions", "set up CI/CD", "deploy on push", "automate deploys", or asks how to wire up auto-deploy from a git push.
---

# Generate CI/CD workflow

## 1. Generate

```bash
npx @infrasynctech/infra-kit generate-workflow
```

This writes `.github/workflows/deploy.yml`.

## 2. Show the generated file

```bash
cat .github/workflows/deploy.yml
```

## 3. List required secrets

Tell the user to add these in **GitHub → Settings → Secrets and variables → Actions**:

- `SSH_PRIVATE_KEY` — private key for the deploy user
- `SSH_HOST` — server IP
- `SSH_USER` — SSH user (usually matches `.infra/config.json`)
- `COOLIFY_TOKEN` — Coolify API token used to fire deploy webhooks

If the project is multi-environment, suggest a `_PROD` / `_STAGING` suffix on each secret and let the user pick the convention.

## 4. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Generated GitHub Actions workflow" >> .infra/CHANGELOG.md
```

## 5. Report

> ✅ Workflow at `.github/workflows/deploy.yml`.
> Add the listed secrets, then push to trigger a deploy.
