# flomo 快速采集器 v0.1

这是一个云端优先的 flomo 快速采集系统，用于把桌面端、Android 端等入口采集到的内容统一交给云端处理。

## 当前结构

- `apps/api`：可运行的云端 API 服务，包含 Token 鉴权、标签校验、AI 整理兜底、失败草稿保护，以及 flomo MCP 适配层。
- `apps/desktop`：桌面端采集入口的 Tauri + React 实现说明和 API 契约。
- `apps/android`：Android 快速采集、分享入口、小组件的实现说明和 API 契约。
- `packages/shared`：客户端和服务端共用的 TypeScript 类型契约。

本地开发默认使用 JSON 文件存储；部署到 CloudBase 时可切换为 CloudBase 文档型数据库。

## 本地运行

先编辑 `.env`，然后运行：

```bash
npm run dev:api
```

健康检查：

```bash
curl http://localhost:8787/health
```

配置状态检查：

```bash
curl http://localhost:8787/api/config/status \
  -H "Authorization: Bearer local-dev-token-change-before-deploy"
```

flomo MCP 使用 streamable HTTP。可以填写完整授权头：

```env
FLOMO_MCP_ENDPOINT=https://flomoapp.com/mcp
FLOMO_MCP_AUTHORIZATION=Bearer 你的密钥
```

也可以只填写 token 值：

```env
FLOMO_MCP_TOKEN=你的密钥
```

DeepSeek 配置：

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

如果更看重质量，可以把模型改成 `deepseek-v4-pro`。

采集测试：

```bash
curl -X POST http://localhost:8787/api/capture \
  -H "Authorization: Bearer local-dev-token-change-before-deploy" \
  -H "Content-Type: application/json" \
  -d "{\"raw_text\":\"今天想到 NDD 评价模块第一版不要判断好坏，只输出偏离程度、偏离维度和偏离场景分布\",\"source\":\"desktop\",\"client_id\":\"desktop-win-001\",\"mode\":\"auto\"}"
```

## 部署

生产环境推荐使用 CloudBase 云托管 + CloudBase 文档型数据库。详细说明见 [CloudBase 部署说明](deploy/cloudbase/README.md)。

CloudBase 控制台自动部署时，请填写：

```text
代码目录：/
Dockerfile 名称：Dockerfile
容器端口：8787
```

不要把 Dockerfile 名称写成 `apps/api/Dockerfile`。

`docker-compose.yml` 仍保留用于本地 Docker 冒烟测试，会把数据持久化到 `./data`。API Token、DeepSeek Key、flomo 授权信息不要提交到仓库。
