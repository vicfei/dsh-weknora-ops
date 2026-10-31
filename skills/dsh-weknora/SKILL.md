---
name: dsh-weknora
description: Query and operate WeKnora knowledge bases — grounded answers with citations, hybrid retrieval, document ingest, tag trees — via weknora-cli.
---

Use this skill whenever the task touches knowledge the team keeps in WeKnora: internal docs, product rules, research reports, wikis. **Cite, don't recall**: for any factual claim that WeKnora could ground, run a query and answer from what comes back — never from memory alone.

## Setup (once)

`WEKNORA_URL` (default `http://127.0.0.1:8080`), `WEKNORA_API_KEY`, optional `WEKNORA_TENANT_ID` must be in the environment. If missing, tell the person the one-line fix instead of guessing a key. The key should be workspace-scoped with capabilities `retrieve`, `chat`, `ingest` — that scope is the enforcement layer for everything below.

## Reading (agent-free — use freely)

```bash
weknora-cli status                       # health + auth probe; run this first in a session
weknora-cli kb list                      # find the right knowledge base id
weknora-cli search <kb> "<query>" --top-k 5
weknora-cli ask <kb> "<question>"        # knowledge-grounded answer with references
weknora-cli doc list <kb>                # documents + parse status
weknora-cli tagtree <kb>                 # hierarchical tag tree
```

- Prefer `search` when you need evidence to reason with; prefer `ask` when the person wants an answer and you will cite it verbatim.
- Tag-tree node ids are not tag ids. To filter by a subtree, take the node's tag ids (nodes with non-empty `tag_id`, plus descendants) from `tagtree` output.
- Output is clipped to protect your context. If a listing page is cut, page with `--page N` rather than widening.

## Ingest (only when a person asked for it)

```bash
weknora-cli doc upload <kb> <file>
weknora-cli doc url <kb> <url>
weknora-cli doc manual <kb> "<text>" --title "Title"
```

State what you are ingesting and into which knowledge base before running it. After ingest, `doc list <kb>` shows parse status; report failures (parse_status, error messages) back to the person rather than retrying silently.

## Destructive (double-gated)

`doc delete` requires the person's explicit confirmation **in this conversation**, then `--yes`. The API key scope is the second gate — if a delete 403s, the key lacks the capability and that is the answer to report, not an error to work around. Never delete to "clean up" on your own initiative.

## Discipline

- One `status` per session start; don't re-probe before every call.
- WeKnora answers are as current as its documents. If the person asks "latest"/"current" state, say the answer's as-of date from the references instead of implying freshness.
- When a query returns nothing useful, say so and suggest which knowledge base or tag subtree might hold it — don't fabricate grounding.
