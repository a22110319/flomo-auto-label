# flomo 本地多端采集器 v0.1

这是一个本地优先的 flomo 快速采集工具。桌面端和 Android 端都可以作为采集入口，各端本地读取 flomo 标签、调用 AI 整理正文并选择标签，再通过 flomo MCP 写入 flomo。

flomo 是唯一的数据沉淀和同步层。本工具默认不负责跨端同步历史、草稿或标签缓存，因此不需要默认部署云服务。

## 当前定位

默认路线：

```text
桌面端 / Android 端
  ↓
本地采集引擎
  ↓
DeepSeek / OpenAI
  ↓
flomo MCP
  ↓
flomo
```

CloudBase 只作为可选方案保留：当你以后需要隐藏移动端密钥、统一远程规则、跨端草稿同步或远程管理时，再启用云托管。

## 项目结构

- `apps/api`：本地采集引擎。它目前以 HTTP API 形式运行在本机，默认地址是 `http://127.0.0.1:8787`。
- `apps/desktop`：桌面端计划，后续用 Tauri + React 实现快捷键输入。
- `apps/android`：Android 端计划，后续实现输入页、分享入口和桌面小组件。
- `packages/shared`：多端共用逻辑，包括 API 类型、AI prompt、标签校验、API client。
- `deploy/cloudbase`：可选的 CloudBase 部署参考，不是 v0.1 默认路线。

## 本地运行采集引擎

先编辑 `.env`，然后运行：

```bash
npm run dev:api
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

配置状态检查：

```bash
curl http://127.0.0.1:8787/api/config/status \
  -H "Authorization: Bearer local-dev-token-change-before-deploy"
```

采集测试：

```bash
curl -X POST http://127.0.0.1:8787/api/capture \
  -H "Authorization: Bearer local-dev-token-change-before-deploy" \
  -H "Content-Type: application/json" \
  -d "{\"raw_text\":\"今天想到 NDD 评价模块第一版不要判断好坏，只输出偏离程度、偏离维度和偏离场景分布\",\"source\":\"desktop\",\"client_id\":\"desktop-win-001\",\"mode\":\"auto\"}"
```

## DeepSeek 配置

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

如果更看重质量，可以把模型改成 `deepseek-v4-pro`。

## flomo MCP 配置

flomo MCP 使用 streamable HTTP。可以填写完整授权头：

```env
FLOMO_MCP_ENDPOINT=https://flomoapp.com/mcp
FLOMO_MCP_AUTHORIZATION=Bearer 你的密钥
```

也可以只填写 token 值：

```env
FLOMO_MCP_TOKEN=你的密钥
```

## 桌面端与 Android 端

v0.1 的建议实现方式：

```text
桌面端：调用本机 local-engine，也就是 apps/api
Android 端：内置同一套 shared prompt、标签校验和 API 调用逻辑，直接调用 AI 与 flomo MCP
```

长期更推荐 Android 端本地直连 DeepSeek 和 flomo MCP，不依赖电脑开着。

## 可选 CloudBase

CloudBase 不是默认路线。只有当你需要这些能力时再启用：

- 不想把 DeepSeek Key 或 flomo 授权放在手机端
- 想统一远程 prompt 和标签策略
- 想跨端同步失败草稿
- 想做 Web 管理台或远程配置

可选部署说明见 [CloudBase 可选部署说明](deploy/cloudbase/README.md)。

## 本地 Docker 冒烟测试

`docker-compose.yml` 可用于本地 Docker 测试，会把数据持久化到 `./data`。API Token、DeepSeek Key、flomo 授权信息不要提交到仓库。
