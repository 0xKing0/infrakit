---
name: infra-deploy
description: Deploy a service to a target environment via its Coolify webhook. Use whenever the user says "deploy", "ship it", "push to prod", "release", "roll out", "let's deploy this", "deploy {service}", "deploy to staging/production", or otherwise asks to publish a new version of a service. Always confirms before posting the webhook. Reads the webhook URL from .infra/config.json.
argument-hint: <service> [env]
---

# Deploy a service

Deploy `$1` to environment `$2` (default `production`). Follow the policy in `infra-ops` (gated action — must confirm).

## 1. Resolve the deploy target

Read `.infra/config.json` locally:

```bash
cat .infra/config.json
```

For the matching service, find:

- `services[].deployWebhook[$2]` — the Coolify webhook URL for the chosen env.
- If the config uses the legacy single-env format, fall back to `services[].deployWebhook` (string).
- If no webhook is configured, **stop** and tell the user to run `/infra-add-service` or edit `config.json`. Do not guess a URL.

Resolve the current image so the user can compare:

```bash
docker service inspect ${INFRA_KIT_PROJECT}_$1 --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"
```

(server shell, via `mcp__ssh-*__exec`)

## 2. Confirm

Ask:

> Deploy **$1** to **$2**?
> Current image: `{image}`
> Webhook: `{host of webhook URL}`
> Proceed?

Wait for an explicit "yes" / "ok" / "go". On anything else, stop.

## 3. Trigger the webhook (local shell)

```bash
curl -fsS -X POST "${WEBHOOK_URL}" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -w "\nHTTP %{http_code}\n"
```

`COOLIFY_TOKEN` is read from the developer's environment. If unset, ask the user to export it.

## 4. Verify (server shell)

Poll up to ~60s for the service to reach desired replicas:

```bash
for i in 1 2 3 4 5 6; do
  docker service ls --filter name=${INFRA_KIT_PROJECT}_$1
  sleep 10
done
docker service logs ${INFRA_KIT_PROJECT}_$1 --tail 30 --timestamps
```

## 5. Log

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Deployed $1 to $2" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

Also append to the local CHANGELOG:

```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Deployed $1 to $2" >> .infra/CHANGELOG.md
```

## 6. Report

Use the status glyph from `infra-ops`. Include: replicas before/after, new image tag if visible, and any error lines from the post-deploy logs.
