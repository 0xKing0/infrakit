---
name: infra-workflow
description: Generate a GitHub Actions deploy workflow for this project.
disable-model-invocation: true
---

# Generate CI/CD Workflow

```bash
npx @infrasynctech/infra-kit generate-workflow
```

Show the generated `.github/workflows/deploy.yml` file and list the required GitHub secrets:
- `SSH_PRIVATE_KEY` — private key for server access
- `SSH_HOST` — server IP address
- `SSH_USER` — SSH username
