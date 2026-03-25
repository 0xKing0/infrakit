---
name: infra-add-service
description: Add a new service to the project config.
disable-model-invocation: true
---

# Add Service

Ask the user:
- Service name
- Deploy path (default: `/opt/{project}/{service}/`)
- Port (optional)

Then update `.infra/config.json` — add the service to the `services` array.

After updating:
```bash
npx @infrasynctech/infra-kit sync
```

Report: "{service} added and synced."
