---
name: infra-overview
description: Show every project running on this server with a one-line health summary. Use whenever the user says "what's running on the server", "list all projects", "server overview", "show all services", "what else is on this box", or asks for a global view across projects (not just the current one).
---

# Server overview

This is a multi-project view. All commands run on the **server shell**.

## 1. Project index

```bash
cat /root/.context/INDEX.md 2>/dev/null || echo "(no INDEX.md — only the current project is registered)"
```

## 2. All Swarm services

```bash
docker service ls --format 'table {{.Name}}\t{{.Replicas}}\t{{.Image}}'
```

## 3. Host capacity

```bash
df -h /
free -h
uptime
```

## 4. Report

For every project named in `INDEX.md` (or each prefix you can see in `docker service ls`), produce one row:

```
{project}: {n_services} services, {healthy}/{total} healthy {glyph}
```

Then list any projects with services not at full replicas, and any host-level concerns (load > CPU count, disk >80%, RAM >90%).

Do **not** restart or modify services in another project — that's forbidden by `infra-ops`. Only report.
