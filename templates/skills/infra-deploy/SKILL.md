---
name: infra-deploy
description: Deploy a service via Coolify webhook. Ask for confirmation before deploying.
argument-hint: [service]
disable-model-invocation: true
---

# Deploy Service

1. Ask for confirmation: "Deploy $ARGUMENTS to production?"

2. After confirmation:
```bash
curl -X POST "http://localhost:8000/api/v1/webhooks/deploy/{uuid}" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

3. Wait and verify:
```bash
sleep 15
docker service ls | grep $INFRA_KIT_PROJECT
```

4. Log:
```bash
echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Deployed $ARGUMENTS via Coolify" >> /root/.context/$INFRA_KIT_PROJECT/CHANGELOG.md
```

Report the result with service status.
