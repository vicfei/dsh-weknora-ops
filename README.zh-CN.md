# dsh-weknora

**把 WeKnora 知识库装进你的 DeepSeek Harness 智能体——带引用的 grounded 回答、混合检索、文档入库、标签树。**

一个 [DeepSeek Harness](https://www.deepseek.com/en/harness/) 插件（bundle：`cordis.patch.yml` + 技能 + `weknora-cli`），对接开源知识库平台 [WeKnora](https://github.com/Tencent/WeKnora)。你的 DSH 智能体从此不再凭记忆猜内部事实，而是**逐条引用**它们。

> 独立社区项目，与 DeepSeek、腾讯均无隶属关系。bundle 格式参照 MIT 协议的 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)；API 面以 WeKnora 公开文档为准。[English](README.md)

---

## 为什么做

编码智能体最自信满满胡编的，恰恰是团队早就写在某处的东西：产品规则、部署规程、合规约束、研究结论。WeKnora 存着这些事实源头——本插件把它放到一条命令的距离内，并强制一条纪律：**引用，而不是回忆**。

## 能力面

| | 命令 | 作用 |
|---|---|---|
| **查询** | `weknora-cli ask <kb> "<问题>"` | 基于 knowledge-grounded 的回答，**附引用** |
| | `weknora-cli search <kb> "<查询>" --top-k 5` | 混合检索（向量+关键词），返回带出处的分块 |
| | `weknora-cli kb list` / `kb show` | 知识库列表/详情 |
| | `weknora-cli doc list <kb>` | 文档列表 + 解析状态 |
| | `weknora-cli tagtree <kb>` | 层级标签树（子树 tag_id 可作过滤提示） |
| **入库** | `weknora-cli doc upload / url / manual` | 上传文档 / 网页 / 手工知识 |
| **破坏性** | `weknora-cli doc delete … --yes` | 删除文档（双重门禁） |

## 安全模型——三层

1. **技能礼仪**（`skills/dsh-weknora/SKILL.md`）：读操作随用；入库仅当真人要求；删除须对话中明确确认。技能文本本身不授予任何许可——授权来自周围的人。
2. **CLI 闸门**：`doc delete` 不带 `--yes` 直接拒绝。
3. **强制层（真正的墙）**：空间级 scoped API Key，只给 `retrieve` / `chat` / `ingest` 能力。没有 `manage_kbs` 的钥匙做不了破坏——智能体怎么试都一样，403 就是答案，不是要绕开的障碍。

这与 [dsh-super-agent](https://github.com/vicfei/dsh-super-agent) 的准入控制哲学同源：信任是结构性的，不是提示词劝出来的。

## 安装

```bash
git clone https://github.com/vicfei/dsh-weknora && cd dsh-weknora
npm install && npm run build

npm link   # 或 npm i -g .，暴露 weknora-cli

# 环境（WeKnora 设置 → API Keys 创建空间级 key，能力勾 retrieve/chat/ingest）
export WEKNORA_URL=http://127.0.0.1:8080
export WEKNORA_API_KEY=wk-…

weknora-cli status   # 健康检查 + 认证探测
```

接入 DSH profile：应用本仓 `cordis.patch.yml`（示例见 `examples/profile.cordis.patch.yml`），或把 `skills/dsh-weknora/` 放进 profile 的技能目录。

## 当前状态

v0.1.0 垂直切片：7 个读命令、3 个入库命令、删除门禁、单元测试。流式 `ask`（SSE）、agent-chat 操作、MCP 端点模式见[路线图](docs/DESIGN.md)。

## 致谢

- [Tencent/WeKnora](https://github.com/Tencent/WeKnora)（MIT）——本插件对话的平台。
- [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)（MIT）——本仓参照的 bundle 格式来源。

## 许可

MIT
