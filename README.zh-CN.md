# dsh-weknora-ops

**WeKnora 的写路径与治理：文档入库、门禁化删除、标签树——在 DeepSeek Harness 智能体里，三层安全模型兜底。**

一个 [DeepSeek Harness](https://www.deepseek.com/en/harness/) 插件（技能 + `weknora-ops` CLI），对接开源知识库平台 [WeKnora](https://github.com/Tencent/WeKnora)。

> **与官方插件的关系**：WeKnora 官方自带只读 DSH 插件 [`@wxg-prc-cpg/dsh-weknora`](https://github.com/Tencent/WeKnora/tree/main/packages/dsh-weknora)——四个查询工具（list/search/read/ask），原生 cordis 工具，带契约测试。**查询请用官方的。** 本项目覆盖官方明确不做的**写路径**——入库、双重门禁下的删除、标签树——外加偏好 CLI 形态时可用的读命令。两者可并行安装。

> 独立社区项目，与 DeepSeek、腾讯均无隶属关系。bundle 格式参照 MIT 协议的 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)；API 面以 WeKnora 公开文档为准。[English](README.md)

---

## 为什么做

编码智能体最自信满满胡编的，恰恰是团队早就写在某处的东西：产品规则、部署规程、合规约束、研究结论。WeKnora 存着这些事实源头——本插件把它放到一条命令的距离内，并强制一条纪律：**引用，而不是回忆**。

## 能力面

| | 命令 | 作用 |
|---|---|---|
| **查询** | `weknora-ops ask <kb> "<问题>"` | 基于 knowledge-grounded 的回答，**附引用** |
| | `weknora-ops search <kb> "<查询>" --top-k 5` | 混合检索（向量+关键词），返回带出处的分块 |
| | `weknora-ops kb list` / `kb show` | 知识库列表/详情 |
| | `weknora-ops doc list <kb>` | 文档列表 + 解析状态 |
| | `weknora-ops tagtree <kb>` | 层级标签树（子树 tag_id 可作过滤提示） |
| **入库** | `weknora-ops doc upload / url / manual` | 上传文档 / 网页 / 手工知识 |
| **破坏性** | `weknora-ops doc delete … --yes` | 删除文档（双重门禁） |

## 安全模型——三层

1. **技能礼仪**（`skills/dsh-weknora-ops/SKILL.md`）：读操作随用；入库仅当真人要求；删除须对话中明确确认。技能文本本身不授予任何许可——授权来自周围的人。
2. **CLI 闸门**：`doc delete` 不带 `--yes` 直接拒绝。
3. **强制层（真正的墙）**：空间级 scoped API Key，只给 `retrieve` / `chat` / `ingest` 能力。没有 `manage_kbs` 的钥匙做不了破坏——智能体怎么试都一样，403 就是答案，不是要绕开的障碍。

这与 [dsh-super-agent](https://github.com/vicfei/dsh-super-agent) 的准入控制哲学同源：信任是结构性的，不是提示词劝出来的。

## 安装

```bash
git clone https://github.com/vicfei/dsh-weknora-ops && cd dsh-weknora-ops
npm install && npm run build

npm link   # 或 npm i -g .，暴露 weknora-ops

# 凭据 —— DSH 的 agent shell 会擦洗 *KEY* 环境变量，配置文件是 DSH 内的主渠道；env 在 CI/运维场景仍然有效
mkdir -p ~/.config/weknora-ops && chmod 700 ~/.config/weknora-ops
cat > ~/.config/weknora-ops/config <<'EOF'   # 空间级 key：WeKnora 设置 → API Keys，能力勾 retrieve/chat/ingest
export WEKNORA_URL=http://127.0.0.1:8080
export WEKNORA_API_KEY=wk-…
EOF
chmod 600 ~/.config/weknora-ops/config

weknora-ops status   # 健康检查 + 认证探测
```

接入 DSH profile：应用本仓 `cordis.patch.yml`（示例见 `examples/profile.cordis.patch.yml`），或把 `skills/dsh-weknora-ops/` 放进 profile 的技能目录。

## 当前状态

v0.1.1 垂直切片：7 个读命令、3 个入库命令、删除门禁、单元测试。**已完成活体端到端实测**：DSH 0.2.1-rc.5（headless + DeepSeek 供应商）驱动 `weknora-ops` 对真实 WeKnora v3.1.3 服务器——技能发现、`status`、`kb list`（542 个知识库）、`search` 带引用命中全链路跑通；该轮测试还抓出并修复了两个真实集成 bug（DSH 擦洗 *KEY* 环境变量 → 改配置文件通道；v0.8.0 系服务器要求 `query_text`/`match_count`）。`ask` 走 v5 线会话流——旧服务器上技能自动回退为 `search` + 自行综合。流式回答、agent-chat 操作、MCP 端点模式见[路线图](docs/DESIGN.md)。

## 致谢

- [Tencent/WeKnora](https://github.com/Tencent/WeKnora)（MIT）——本插件对话的平台。
- [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)（MIT）——本仓参照的 bundle 格式来源。

## 许可

MIT
