---
name: infra-add-env
description: Add a new environment like staging or production.
disable-model-invocation: true
---

# Add Environment

Ask the user:
- Environment name (e.g. staging)
- Server IP
- SSH user (default: root)
- SSH key path
- Copy services from production? (default: yes)

If `.infra/config.json` uses single-server format, migrate it:
- Move current `server`, `services`, `scaling`, `backup` under `environments.production`

Add the new environment to `environments.{name}`.

After updating:
```bash
npx @infrasynctech/infra-kit sync --env {name}
```

Report: "{name} environment added. Use --env {name} with commands."
