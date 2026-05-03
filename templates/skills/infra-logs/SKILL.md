---
name: infra-logs
description: Show or follow logs for a Docker Swarm service on the server. Use whenever the user says "logs", "show me the logs", "tail logs", "follow logs", "what is {service} doing", "any errors in {service}", "grep logs for X", "what's happening with {service}", or asks anything about service output, errors, or runtime behavior.
argument-hint: <service> [-f|--follow|errors|"<grep pattern>"]
---

# Service logs

Show logs for `$1`. Second argument controls mode:

- `-f` or `--follow` → stream
- `errors` → filter to error lines
- any other string → grep pattern
- omitted → last 100 lines

All commands run on the **server shell** (via `mcp__ssh-*__exec`).

## Default — last 100 lines

```bash
docker service logs ${INFRA_KIT_PROJECT}_$1 --tail 100 --timestamps
```

## Follow

If `$2` is `-f` or `--follow`:

```bash
docker service logs ${INFRA_KIT_PROJECT}_$1 --follow --timestamps
```

(Run with a sensible timeout — don't stream forever.)

## Errors only

If `$2` is `errors` or the user mentioned "errors":

```bash
docker service logs ${INFRA_KIT_PROJECT}_$1 --tail 500 --timestamps 2>&1 \
  | grep -iE "error|fatal|panic|exception|stalled|OOMKilled|ECONNREFUSED|timeout"
```

## Grep pattern

If `$2` is anything else, treat it as a literal string:

```bash
docker service logs ${INFRA_KIT_PROJECT}_$1 --tail 500 --timestamps 2>&1 \
  | grep -F -- "$2"
```

## After showing

Summarize: dominant error patterns (cross-reference the table in `infra-ops`), restart frequency if visible, and one recommended next step.

If the logs match an autonomous trigger in `infra-ops` (e.g. `Queue stalled`, `ECONNREFUSED 5432`), suggest the matching action and offer to run it.
