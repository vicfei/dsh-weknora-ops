# dsh-weknora-ops

**The write path and governance for WeKnora in your DeepSeek Harness agent — document ingest, gated deletes, tag trees — under a three-layer safety model.**

A [DeepSeek Harness](https://www.deepseek.com/en/harness/) plugin (skill + `weknora-ops` CLI) for [WeKnora](https://github.com/Tencent/WeKnora), the open-source knowledge-base platform.

> **Relation to the official plugin**: WeKnora ships its own read-only DSH plugin, [`@wxg-prc-cpg/dsh-weknora`](https://github.com/Tencent/WeKnora/tree/main/packages/dsh-weknora) — four query tools (list/search/read/ask), native cordis tools, contract-tested. **For querying, use theirs.** This project covers what the official one deliberately does not: the *write* path — ingest, deletion under a double gate, tag trees — plus read verbs for environments where a CLI form factor is preferred. Both can be installed side by side.

> Independent community project. Not affiliated with DeepSeek or Tencent. Bundle format follows the MIT-licensed [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype); WeKnora API surface per its public docs. [中文文档](README.zh-CN.md)

---

## Why

Coding agents confidently hallucinate exactly the things your team wrote down somewhere: product rules, deploy procedures, compliance constraints, research conclusions. WeKnora holds that ground truth — this plugin puts it one command away and enforces a simple discipline: **cite, don't recall**.

## Capabilities

| | Command | What it does |
|---|---|---|
| **Query** | `weknora-ops ask <kb> "<q>"` | Knowledge-grounded answer **with references** |
| | `weknora-ops search <kb> "<q>" --top-k 5` | Hybrid retrieval (vector + keyword) with cited chunks |
| | `weknora-ops kb list` / `kb show` | Knowledge bases |
| | `weknora-ops doc list <kb>` | Documents + parse status |
| | `weknora-ops tagtree <kb>` | Hierarchical tag tree (filter hint: subtree tag ids) |
| **Ingest** | `weknora-ops doc upload / url / manual` | Add documents, web pages, manual knowledge |
| **Destructive** | `weknora-ops doc delete … --yes` | Delete a document (double-gated) |

## Safety model — three layers

1. **Skill etiquette** (`skills/dsh-weknora-ops/SKILL.md`): reads are agent-free; ingests only when a person asked; deletes need explicit in-conversation confirmation. Nothing in the skill grants permission — the surrounding conversation does.
2. **CLI gate**: `doc delete` refuses without `--yes`.
3. **Enforcement (the real wall)**: a workspace-scoped API key with capabilities `retrieve` / `chat` / `ingest`. A key without `manage_kbs` simply cannot do damage, whatever the agent tries — 403 is the answer, not an obstacle to work around.

This mirrors the admission-control philosophy of [dsh-super-agent](https://github.com/vicfei/dsh-super-agent): trust is structural, not persuaded.

## Install

```bash
git clone https://github.com/vicfei/dsh-weknora-ops && cd dsh-weknora-ops
npm install && npm run build

# expose weknora-ops (global install or link)
npm link   # or: npm i -g .

# credentials — config file is the primary channel inside DSH (its agent shell
# scrubs *KEY* env vars); env vars still work for CI/ops
mkdir -p ~/.config/weknora-ops && chmod 700 ~/.config/weknora-ops
cat > ~/.config/weknora-ops/config <<'EOF'   # workspace API key: WeKnora 设置 → API Keys, capabilities retrieve/chat/ingest
export WEKNORA_URL=http://127.0.0.1:8080
export WEKNORA_API_KEY=wk-…
EOF
chmod 600 ~/.config/weknora-ops/config

# smoke — health + auth probe
weknora-ops status
```

Into a DSH profile: apply this repo's `cordis.patch.yml` (see `examples/profile.cordis.patch.yml`), or drop `skills/dsh-weknora-ops/` into your profile's skills directory.

## Status

v0.1.1 — vertical slice: 7 read verbs, 3 ingest verbs, delete gate, unit tests. **Live-tested end to end**: DSH 0.2.1-rc.5 (headless, DeepSeek provider) driving `weknora-ops` against a real WeKnora v3.1.3 server — skill discovery, `status`, `kb list` (542 KBs), `search` with cited hits; the run also caught and fixed two real integration bugs (env scrubbing → config file; `query_text`/`match_count` on v0.8.0-line servers). `ask` follows the v5-line session flow — on older servers the skill falls back to `search` + synthesis. Streaming answers, agent-chat operations and an MCP-endpoint mode are on the [roadmap](docs/DESIGN.md).

## Acknowledgments

- [Tencent/WeKnora](https://github.com/Tencent/WeKnora) (MIT) — the platform this plugin talks to.
- [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) (MIT) — the observed bundle format this repo follows.

## License

MIT
