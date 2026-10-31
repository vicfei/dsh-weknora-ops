# Design notes

## Shapes

- **Bundle** (`cordis.patch.yml`): inserts one plugin entry, no config — follows the format observed in `deepseek-ai/dsh-superagent-prototype` (DSH engine ^0.2.x). All configuration is environment.
- **Skill** (`skills/dsh-weknora/SKILL.md`): teaches cite-don't-recall, when to `search` vs `ask`, tag-tree id semantics, and the ingest/delete etiquette.
- **CLI** (`weknora-cli`): zero-runtime-dependency TypeScript (Node 20+ fetch). Output is clipped (head+tail, marked) to protect the agent's context budget.

## Safety

Three independent layers (see README). The load-bearing one is the WeKnora scoped API key: capabilities `retrieve`/`chat`/`ingest`, no `manage_kbs`. The skill and the `--yes` gate are etiquette; the key is the wall. This mirrors dsh-super-agent's admission philosophy applied at the tool boundary.

## API endpoints used (WeKnora /api/v1)

| Verb | Route |
|---|---|
| status | `GET /health`, `GET /knowledge-bases` (probe) |
| kb list/show | `GET /knowledge-bases`, `GET /knowledge-bases/:id` |
| search | `POST /knowledge-bases/:id/hybrid-search` |
| ask | `POST /knowledge-chat/:session_id` |
| doc list | `GET /knowledge-bases/:id/knowledge` |
| tagtree | `GET /knowledge-bases/:id/tag-tree` |
| doc upload/url/manual | `POST /knowledge-bases/:id/knowledge/{file,url,manual}` |
| doc delete | `DELETE /knowledge-bases/:id/knowledge/:doc` |

## Roadmap

- Streaming `ask` (SSE consumption + progressive references)
- `agent-chat` operations (create/inspect agent sessions from the CLI)
- MCP-endpoint mode: point the plugin at a WeKnora MCP endpoint token instead of an API key
- Per-KB capability narrowing via the key's `knowledge_base_ids` allowlist, documented in SKILL.md
